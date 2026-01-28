import { Injectable } from '@angular/core'
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { firstValueFrom } from 'rxjs'

export interface UploadResponse {
  success: boolean
  message: string
  url?: string
  fileName?: string
  fileSize?: number
  id?: string
}

export interface SubmissionReadDTO {
  id: string
  sessionId: string
  userId: string
  fileName: string
  fileSize: number
  mimeType: string
  version: number
  status: string
  uploadedAt: string
  submittedAt?: string
  comment?: string
}

export interface ExistingSubmissionsResponse {
  submissions: SubmissionReadDTO[]
  total: number
}

/**
 * Service pour gérer l'upload de fichiers vers le serveur
 * À adapter selon votre backend
 */
@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private readonly uploadUrl = '/api/v1/sessions/{{SESSION_ID}}/submissions/upload'

  constructor(private http: HttpClient) {}

  /**
   * Upload un fichier unique
   * @param file Le fichier à uploader
   * @param endpoint L'endpoint API (par défaut /api/upload)
   * @returns Un Observable contenant les événements d'upload (progression et réponse)
   */
  uploadFile(file: File, sessionId: string): Observable<HttpEvent<UploadResponse>> {
    const url = this.uploadUrl.replace('{{SESSION_ID}}', sessionId)
    const formData = new FormData()
    formData.append('file', file)

    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true,
    })

    return this.http.request<UploadResponse>(req)
  }

  /**
   * Upload plusieurs fichiers
   * @param files Les fichiers à uploader
   * @param endpoint L'endpoint API (par défaut /api/upload)
   * @returns Un Observable contenant les événements d'upload pour tous les fichiers
   */
  uploadFiles(files: File[], endpoint?: string): Observable<HttpEvent<UploadResponse>> {
    const url = endpoint || this.uploadUrl
    const formData = new FormData()

    files.forEach((file) => {
      formData.append(`files`, file)
    })

    return this.http.post<UploadResponse>(url, formData, { reportProgress: true, observe: 'events' })
  }

  /**
   * Upload un fichier avec un ID de référence
   * @param file Le fichier à uploader
   * @param referenceId L'ID de référence (ex: ID d'une ressource)
   * @param endpoint L'endpoint API
   * @returns Un Observable contenant les événements d'upload
   */
  uploadFileWithReference(file: File, referenceId: string, endpoint?: string): Observable<HttpEvent<UploadResponse>> {
    const url = endpoint || this.uploadUrl
    const formData = new FormData()
    formData.append('file', file)
    formData.append('referenceId', referenceId)

    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true,
    })

    return this.http.request<UploadResponse>(req)
  }

  /**
   * Upload un fichier de soumission étudiant (rendus)
   * @param file Le fichier de soumission
   * @param sessionId L'ID de la session d'exercice
   * @param comment Commentaire optionnel
   * @returns Un Observable contenant les événements d'upload
   */
  uploadStudentSubmission(file: File, sessionId: string, comment?: string): Observable<HttpEvent<UploadResponse>> {
    const formData = new FormData()
    formData.append('file', file)
    if (comment) {
      formData.append('comment', comment)
    }

    const endpoint = this.uploadUrl.replace('{{SESSION_ID}}', sessionId)

    const req = new HttpRequest('POST', endpoint, formData, {
      reportProgress: true,
    })

    return this.http.request<UploadResponse>(req)
  }

  /**
   * Télécharger un fichier via requête HTTP authentifiée
   * @param fileUrl L'URL du fichier à télécharger
   * @param fileName Le nom du fichier pour le téléchargement
   */
  async downloadFile(fileUrl: string, fileName: string): Promise<void> {
    try {
      // Faire une requête GET avec token d'authentification automatiquement inclus
      const blob = await firstValueFrom(this.http.get(fileUrl, { responseType: 'blob' }))

      // Créer un lien de téléchargement à partir du blob
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error(`Erreur lors du téléchargement de ${fileName}:`, error)
      throw error
    }
  }

  /**
   * Supprimer un fichier du serveur
   * @param fileUrl L'URL du fichier à supprimer
   * @param endpoint L'endpoint de suppression
   * @returns Un Observable contenant la réponse du serveur
   */
  deleteFile(fileUrl: string, endpoint?: string): Observable<UploadResponse> {
    const url = `${endpoint || this.uploadUrl}/${fileUrl}`
    return this.http.delete<UploadResponse>(url)
  }

  /**
   * Récupère les fichiers déjà envoyés pour une session
   * @param sessionId L'ID de la session
   * @returns Un Observable contenant la liste des fichiers
   */
  getExistingSubmissions(sessionId: string): Observable<ExistingSubmissionsResponse> {
    const endpoint = `/api/v1/sessions/${sessionId}/submissions`
    return this.http.get<any>(endpoint).pipe(
      map((response) => ({
        ...response,
        submissions: response.submissions.map((submission: any) => ({
          ...submission,
          // Convertir uploadedAt en string ISO si c'est un objet Date ou Proxy
          uploadedAt: this.normalizeDate(submission.uploadedAt),
        })),
      }))
    )
  }

  /**
   * Normalise une date (string, Date, ou Proxy) en ISO string
   */
  private normalizeDate(dateValue: any): string {
    if (typeof dateValue === 'string') {
      return dateValue
    }
    try {
      // Si c'est un Date ou une Proxy, essayer de le convertir
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Fallback
    }
    return String(dateValue)
  }

  /**
   * Supprime une soumission du serveur
   * @param sessionId L'ID de la session
   * @param submissionId L'ID de la soumission à supprimer
   * @returns Un Observable de la réponse du serveur
   */
  deleteSubmission(sessionId: string, submissionId: string): Observable<any> {
    const endpoint = `/api/v1/sessions/${sessionId}/submissions/${submissionId}`
    return this.http.delete(endpoint)
  }
}
