import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentService } from '../../web-component.service'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import { FileUploadComponentDefinition, FileUploadState, UploadedFile } from './file-upload'
import { FileUploadService, SubmissionReadDTO, UploadResponse } from './file-upload.service'
import { Subscription } from 'rxjs'
import { HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BaseModule } from '../../shared/components/base/base.module'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'

@Component({
  selector: 'wc-file-upload',
  templateUrl: 'file-upload.component.html',
  styleUrls: ['file-upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseModule,
    CssPipeModule,

    FormsModule,
    ReactiveFormsModule,

    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
})
@WebComponent(FileUploadComponentDefinition)
export class FileUploadComponent implements OnInit, OnDestroy, WebComponentHooks<FileUploadState> {
  readonly injector = inject(Injector)
  readonly changeDetector = inject(WebComponentChangeDetectorService)
  private readonly fileUploadService = inject(FileUploadService)

  private readonly webComponentService!: WebComponentService

  @Input() state!: FileUploadState
  @Output() stateChange = new EventEmitter<FileUploadState>()
  @ViewChild('uploadZone') uploadZoneRef?: ElementRef

  protected errors: string[] = []
  private subscription?: Subscription
  private dragCounter = 0
  private fileMap = new Map<string, File>() // Stocker les fichiers bruts
  private sessionId = ''
  private preloadedFilesCount = 0

  constructor() {
    const injector = this.injector

    this.webComponentService = injector.get(WebComponentService) ?? undefined
  }

  ngOnInit() {
    // Initialize default values if not set
    if (!this.state.uploadedFiles) {
      this.state.uploadedFiles = []
    }
    if (this.state.maxFiles === undefined) {
      this.state.maxFiles = 1
    }
    if (this.state.maxFileSize === undefined) {
      this.state.maxFileSize = 10485760 // 10 MB
    }
    if (!this.state.allowedExtensions) {
      this.state.allowedExtensions = []
    }

    const context = this.webComponentService.getContext() as Record<string, string>
    this.sessionId = context?.['sessionId'] || ''

    if (!this.sessionId) {
      this.errors.push('Erreur: sessionId manquant. Ce composant ne peut pas fonctionner sans sessionId.')
      this.state.disabled = true
      return
    }

    // Fire and forget: intentionally not awaiting or propagating errors from loadExistingSubmissions
    // because failure to load existing submissions should not block the component's initialization.
    void this.loadExistingSubmissions()
  }

  /**
   * Charge les fichiers déjà envoyés pour la session
   */
  private async loadExistingSubmissions() {
    try {
      const response = await firstValueFrom(this.fileUploadService.getExistingSubmissions(this.sessionId))

      if (!response || !response.submissions || response.submissions.length === 0) {
        return
      }

      const existingFiles = response.submissions.map(
        (submission: SubmissionReadDTO): UploadedFile => ({
          id: submission.id,
          name: submission.fileName,
          size: submission.fileSize,
          type: submission.mimeType,
          url: `/api/v1/sessions/${this.sessionId}/submissions/${submission.id}/download`,
          uploadedAt: submission.uploadedAt,
          progress: 100,
          status: 'success',
        })
      )

      void this.changeDetector.ignore(this, () => {
        this.state.uploadedFiles = existingFiles
        this.preloadedFilesCount = existingFiles.length
      })
    } catch (error) {
      const errorMessage = this.getHttpErrorMessage(error, 'chargement des soumissions existantes')
      console.error(errorMessage)
      // Ne pas bloquer si le chargement échoue
    }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe()
  }

  onChangeState() {
    // Reset errors when state changes
    this.errors = []
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (!this.state.disabled && this.dragCounter === 0) {
      this.dragCounter++
      this.updateDragState(true)
    }
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (this.uploadZoneRef?.nativeElement === event.target) {
      this.dragCounter = 0
      this.updateDragState(false)
    }
  }

  /**
   * Handle drop event
   */
  async onDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.dragCounter = 0
    this.updateDragState(false)

    if (this.state.disabled) {
      return
    }

    const files = event.dataTransfer?.files
    if (files) {
      await this.processFiles(files)
    }
  }

  /**
   * Handle file input selection
   */
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files) {
      await this.processFiles(input.files)
    }
    // Reset input
    input.value = ''
  }

  /**
   * Process selected/dropped files
   */
  private async processFiles(files: FileList) {
    this.errors = []
    const filesToAdd: UploadedFile[] = []
    const rawFilesToStore: Array<{ id: string; file: File }> = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = this.validateFile(file)

      if (validationError) {
        this.errors.push(validationError)
        continue
      }

      // Check max files limit (compte les fichiers existants + nouveaux)
      const totalFilesCount = this.state.uploadedFiles.length + filesToAdd.length
      if (this.state.maxFiles > 0 && totalFilesCount >= this.state.maxFiles) {
        this.errors.push(`Limite de ${this.state.maxFiles} fichier(s) atteinte`)
        break
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        progress: 0,
        status: 'uploading',
      }

      filesToAdd.push(uploadedFile)
      rawFilesToStore.push({ id: fileId, file })
    }

    if (filesToAdd.length > 0) {
      // Store raw File objects in fileMap
      for (const { id, file } of rawFilesToStore) {
        this.fileMap.set(id, file)
      }

      await this.changeDetector.ignore(this, () => {
        this.state.uploadedFiles.push(...filesToAdd)
      })

      // Upload files through file upload service
      for (const file of filesToAdd) {
        this.uploadFile(file)
      }
    }
  }

  /**
   * Validate a single file
   */
  private validateFile(file: File): string | null {
    const fileName = file.name
    const fileSize = file.size
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''

    // Check file extension
    if (this.state.allowedExtensions && this.state.allowedExtensions.length > 0) {
      if (!this.state.allowedExtensions.includes(fileExtension)) {
        return `Extension non autorisée: .${fileExtension}. Formats acceptés: ${this.state.allowedExtensions
          .map((e) => `.${e}`)
          .join(', ')}`
      }
    }

    // Check file size
    if (this.state.maxFileSize > 0 && fileSize > this.state.maxFileSize) {
      return `Fichier trop volumineux: ${this.formatFileSize(fileSize)}. Limite: ${this.formatFileSize(
        this.state.maxFileSize
      )}`
    }

    // Check file name regex
    if (this.state.fileNameRegex) {
      const nameWithoutExtension = fileName.replace(/\.[^.]*$/, '')
      try {
        const regex = new RegExp(this.state.fileNameRegex)
        if (!regex.test(nameWithoutExtension)) {
          return `Le nom du fichier ne respecte pas le format requis: ${this.state.fileNameRegex}`
        }
      } catch (_error) {
        // Ignorer les erreurs de regex invalide
      }
    }

    return null
  }

  /**
   * Upload file to server
   */
  private uploadFile(file: UploadedFile) {
    try {
      if (!file.id) {
        this.errors.push(`Erreur: ID de fichier manquant pour ${file.name}`)
        return
      }

      // Get the raw File object from fileMap
      const rawFile = this.fileMap.get(file.id)
      if (!rawFile) {
        this.errors.push(`Erreur: Fichier non trouvé en mémoire pour ${file.name}`)
        return
      }

      const fileIndex = this.state.uploadedFiles.findIndex((f) => f.id === file.id)
      if (fileIndex === -1) return

      // Si pas de sessionId, c'est une erreur
      if (!this.sessionId) {
        const errorMessage = "Erreur: sessionId manquant. Impossible d'envoyer le fichier."
        this.errors.push(errorMessage)
        void this.changeDetector.ignore(this, () => {
          this.state.uploadedFiles[fileIndex].progress = 0
        })
        return
      }

      this.fileUploadService.uploadFile(rawFile, this.sessionId).subscribe({
        next: (event: HttpEvent<UploadResponse>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || rawFile.size
            const progress = total ? Math.round((100 * event.loaded) / total) : 0
            void this.changeDetector.ignore(this, () => {
              this.state.uploadedFiles[fileIndex].progress = progress
            })
          } else if (event.type === HttpEventType.Response) {
            void this.changeDetector.ignore(this, () => {
              this.state.uploadedFiles[fileIndex].progress = 100
              this.state.uploadedFiles[fileIndex].status = 'success'
              const submissionId = event.body?.id
              if (submissionId) {
                const oldId = this.state.uploadedFiles[fileIndex].id
                this.state.uploadedFiles[fileIndex].id = submissionId

                if (oldId) {
                  const rawFileObj = this.fileMap.get(oldId)
                  if (rawFileObj) {
                    this.fileMap.delete(oldId)
                    this.fileMap.set(submissionId, rawFileObj)
                  }
                }

                const downloadUrl = `/api/v1/sessions/${this.sessionId}/submissions/${submissionId}/download`
                this.state.uploadedFiles[fileIndex].url = downloadUrl
              }
            })
          }
        },
        error: (error: Error) => {
          void this.changeDetector.ignore(this, () => {
            this.state.uploadedFiles[fileIndex].progress = 0
            this.state.uploadedFiles[fileIndex].status = 'failed'
          })

          const errorMessage = this.getHttpErrorMessage(error, file.name)
          this.errors.push(errorMessage)
        },
      })
    } catch (error) {
      this.errors.push(
        `Erreur lors de l'upload de ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Gère les erreurs HTTP avec messages structurés
   */
  private getHttpErrorMessage(error: any, fileName: string): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return `Fichier invalide: ${error.error?.message || 'Mauvaise requête'}`
        case 413:
          return `Fichier trop volumineux (max: ${this.formatFileSize(this.state.maxFileSize)})`
        case 401:
          return `Authentification requise. Veuillez vous reconnecter.`
        case 403:
          return `Vous n'avez pas la permission d'uploader ce fichier`
        case 404:
          return `Endpoint non trouvé. Contactez l'administrateur.`
        case 408:
          return `Timeout de requête. Veuillez réessayer.`
        case 409:
          return `Conflit: Ce fichier existe déjà pour cette session`
        case 429:
          return `Trop de requêtes. Veuillez patienter avant de réessayer.`
        case 500:
          return `Erreur serveur. Veuillez réessayer plus tard.`
        case 502:
          return `Passerelle invalide. Le serveur est temporairement indisponible.`
        case 503:
          return `Service indisponible. Veuillez réessayer plus tard.`
        case 504:
          return `Timeout du serveur. Veuillez réessayer.`
        default:
          return `${error.statusText || 'Erreur'} (${error.status}): ${error.error?.message || 'Erreur inconnue'}`
      }
    }

    // Gestion des autres types d'erreurs
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return `Timeout d'upload pour ${fileName} (>5 minutes)`
      }
      return `${fileName}: ${error.message}`
    }

    return `Erreur lors de l'upload de ${fileName}`
  }

  /**
   * Download a file using authenticated request
   */
  protected async downloadFile(file: UploadedFile): Promise<void> {
    if (!file.url) {
      this.errors.push(`Impossible de télécharger: URL manquante pour ${file.name}`)
      return
    }

    try {
      // Use the file upload service to download with authentication
      await this.fileUploadService.downloadFile(file.url, file.name)
    } catch (error) {
      const errorMessage = this.getHttpErrorMessage(error, `téléchargement de ${file.name}`)
      this.errors.push(errorMessage)
    }
  }

  /**
   * Remove a file from the list
   */
  async removeFile(index: number) {
    const fileToRemove = this.state.uploadedFiles[index]

    // Si c'est un fichier existant (avec un URL téléchargeable), le supprimer du serveur
    if (fileToRemove.status === 'success' && fileToRemove.url && fileToRemove.id) {
      try {
        await firstValueFrom(this.fileUploadService.deleteSubmission(this.sessionId, fileToRemove.id))
      } catch (error) {
        const errorMessage = this.getHttpErrorMessage(error, `suppression de ${fileToRemove.name}`)
        this.errors.push(errorMessage)
        return
      }
    }

    // Clean up fileMap entry if it exists
    if (fileToRemove.id) {
      this.fileMap.delete(fileToRemove.id)
    }

    await this.changeDetector.ignore(this, () => {
      this.state.uploadedFiles.splice(index, 1)
    })
    this.errors = this.errors.filter((_, i) => i !== index)
  }

  /**
   * Get file icon based on MIME type
   */
  protected getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType === 'application/pdf') return 'picture_as_pdf'
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'description'
    if (mimeType.includes('word')) return 'description'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table_chart'
    if (mimeType.includes('sheet')) return 'table_chart'
    if (mimeType === 'text/csv') return 'table_chart'
    if (mimeType.startsWith('text/')) return 'text_snippet'
    if (mimeType.startsWith('video/')) return 'video_library'
    if (mimeType.startsWith('audio/')) return 'audio_file'
    if (mimeType.includes('archive') || mimeType.includes('zip')) return 'folder_zip'
    return 'insert_drive_file'
  }

  /**
   * Get error message for a file
   */
  protected getFileError(file: UploadedFile): string | null {
    // Check if file has validation error
    const fileError = this.errors.find((e) => e.includes(file.name))
    return fileError || null
  }

  /**
   * Obtient le nombre de nouveaux fichiers en upload (exclut les fichiers existants)
   */
  protected getNewFilesCount(): number {
    return Math.max(0, this.state.uploadedFiles.length - this.preloadedFilesCount)
  }

  /**
   * Vérifie si la limite maximale de fichiers a été atteinte
   */
  protected isMaxFilesReached(): boolean {
    return this.state.maxFiles > 0 && this.state.uploadedFiles.length >= this.state.maxFiles
  }

  /**
   * Format file size in human readable format
   */
  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Format date to readable string (expects ISO string format)
   */
  protected formatDate(dateString?: string): string {
    if (!dateString || typeof dateString !== 'string') {
      return ''
    }

    let date: Date
    try {
      date = new Date(dateString)
      // Validate the date
      if (isNaN(date.getTime())) {
        return ''
      }
    } catch {
      return ''
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "à l'instant"
    if (diffMins < 60) return `il y a ${diffMins}m`
    if (diffHours < 24) return `il y a ${diffHours}h`
    if (diffDays < 7) return `il y a ${diffDays}j`

    return date.toLocaleDateString('fr-FR')
  }

  /**
   * Update drag state
   */
  private updateDragState(isDragging: boolean) {
    if (this.state.dragActive !== isDragging) {
      void this.changeDetector.ignore(this, () => {
        this.state.dragActive = isDragging
      })
    }
  }
}
