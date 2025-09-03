import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { emptyEditorJsData, UiEditorJsModule } from '@platon/shared/ui'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { firstValueFrom } from 'rxjs'
import { TestsService } from '../../api/tests.service'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { OutputData } from '@editorjs/editorjs'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { AngularSplitModule } from 'angular-split'
import { NzInputModule } from 'ng-zorro-antd/input'
import { EditorjsViewerComponent } from '@platon/shared/ui'

@Component({
  standalone: true,
  selector: 'tests-mail-editor',
  templateUrl: './tests-mail-editor.component.html',
  styleUrls: ['./tests-mail-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    UiEditorJsModule,
    MatIconModule,
    MatTooltipModule,
    NzButtonModule,
    AngularSplitModule,
    NzInputModule,
    EditorjsViewerComponent,
  ],
})
export class TestsMailEditorComponent implements OnInit, OnDestroy {
  mail: OutputData = emptyEditorJsData()
  subject = ''

  private testId = ''
  private courseId = ''

  private autoSaveIntervalId?: ReturnType<typeof setInterval>

  protected hasUnsavedChanges = false

  protected isWaitingForSend = false

  protected copiedVariable: string | null = null
  private copyTimeoutId?: ReturnType<typeof setTimeout>

  protected variables = [
    { name: 'testName', description: 'Nom du test' },
    { name: 'testLink', description: "Lien d'accès au test pour le candidat" },
    { name: 'startDate', description: 'Date de début du test au format local (jour/mois/année)' },
    { name: 'endDate', description: 'Date de fin du test au format local (jour/mois/année)' },
    { name: 'startTime', description: 'Heure de début du test au format local (heure:minute:seconde)' },
    { name: 'endTime', description: 'Heure de fin du test au format local (heure:minute:seconde)' },
    { name: 'duration', description: 'Durée totale du test formatée en français (ex: "2 heures 30 minutes")' },
    { name: 'firstName', description: 'Prénom du candidat' },
    { name: 'lastName', description: 'Nom de famille du candidat' },
    { name: 'email', description: 'Adresse email du candidat' },
    { name: 'currentFirstName', description: "Prénom de l'utilisateur qui envoie l'email" },
    { name: 'currentLastName', description: "Nom de famille de l'utilisateur qui envoie l'email" },
    { name: 'currentEmail', description: "Adresse email de l'utilisateur qui envoie l'email" },
    { name: 'date', description: 'Date actuelle au format local (jour/mois/année)' },
    { name: 'time', description: 'Heure actuelle au format local (heure:minute:seconde)' },
  ]

  constructor(
    public dialogRef: MatDialogRef<TestsMailEditorComponent>,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly testsService: TestsService,
    @Inject(MAT_DIALOG_DATA) public data: { courseId: string }
  ) {}

  async ngOnInit(): Promise<void> {
    const test = await firstValueFrom(this.testsService.getTestByCourseId(this.data.courseId))
    this.testId = test.id
    this.courseId = test.courseId
    this.mail = test.mailContent
    this.subject = test.mailSubject
    this.changeDetectorRef.markForCheck()

    this.dialogRef.beforeClosed().subscribe(async () => {
      if (this.hasUnsavedChanges) {
        await this.saveMail()
      }
    })

    this.autoSaveIntervalId = setInterval(async () => {
      if (this.hasUnsavedChanges) {
        await this.saveMail()
        this.hasUnsavedChanges = false
        this.changeDetectorRef.markForCheck()
      }
    }, 5000)
  }

  ngOnDestroy(): void {
    if (this.autoSaveIntervalId) {
      clearInterval(this.autoSaveIntervalId)
    }
  }

  async close(): Promise<void> {
    if (this.hasUnsavedChanges) {
      await this.saveMail()
      this.hasUnsavedChanges = false
      this.changeDetectorRef.markForCheck()
    }
    this.dialogRef.close()
  }

  protected onChangeData(data: OutputData): void {
    this.mail = data
    this.hasUnsavedChanges = true
    this.changeDetectorRef.markForCheck()
  }

  protected onChangeSubject(): void {
    this.hasUnsavedChanges = true
    this.changeDetectorRef.markForCheck()
  }

  private async saveMail(): Promise<void> {
    await firstValueFrom(this.testsService.updateTestMailContent(this.testId, this.mail, this.subject))
  }

  protected async sendAllMails(): Promise<void> {
    if (this.hasUnsavedChanges) {
      await this.saveMail()
      this.hasUnsavedChanges = false
      this.changeDetectorRef.markForCheck()
    }
    await firstValueFrom(this.testsService.sendAllMails(this.courseId))
    this.dialogRef.close()
  }

  protected initSendAllMails(): void {
    this.isWaitingForSend = true
    this.changeDetectorRef.markForCheck()
  }

  protected cancelSendAllMails(): void {
    this.isWaitingForSend = false
    this.changeDetectorRef.markForCheck()
  }

  async copyVariableToClipboard(variableName: string): Promise<void> {
    const variableText = `{{ ${variableName} }}`
    try {
      await navigator.clipboard.writeText(variableText)

      this.copiedVariable = variableName
      this.changeDetectorRef.markForCheck()

      if (this.copyTimeoutId) {
        clearTimeout(this.copyTimeoutId)
      }
      this.copyTimeoutId = setTimeout(() => {
        this.copiedVariable = null
        this.changeDetectorRef.markForCheck()
      }, 2000)
    } catch (error) {
      console.error('Erreur lors de la copie:', error)
    }
  }

  protected trackByVariableName(index: number, variable: any): string {
    return variable.name
  }
}
