import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { EditorjsViewerComponent, emptyEditorJsData, UiEditorJsModule } from '@platon/shared/ui'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { firstValueFrom } from 'rxjs'
import { TestsService } from '../../api/tests.service'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { OutputData } from '@editorjs/editorjs'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { AngularSplitModule } from 'angular-split'

@Component({
  standalone: true,
  selector: 'tests-terms-editor',
  templateUrl: './tests-terms-editor.component.html',
  styleUrls: ['./tests-terms-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    UiEditorJsModule,
    MatIconModule,
    MatTooltipModule,
    NzButtonModule,
    EditorjsViewerComponent,
    AngularSplitModule,
  ],
})
export class TestsTermsEditorComponent implements OnInit, OnDestroy {
  terms: OutputData = emptyEditorJsData()

  private testId = ''

  private autoSaveIntervalId?: ReturnType<typeof setInterval>

  protected hasUnsavedChanges = false

  protected copiedVariable: string | null = null
  private copyTimeoutId?: ReturnType<typeof setTimeout>

  protected variables = [
    { name: 'testName', description: 'Nom du test' },
    { name: 'startDate', description: 'Date de début du test au format local (jour/mois/année)' },
    { name: 'endDate', description: 'Date de fin du test au format local (jour/mois/année)' },
    { name: 'startTime', description: 'Heure de début du test au format local (heure:minute:seconde)' },
    { name: 'endTime', description: 'Heure de fin du test au format local (heure:minute:seconde)' },
    { name: 'duration', description: 'Durée totale du test formatée en français (ex: "2 heures 30 minutes")' },
    { name: 'firstName', description: 'Prénom du candidat' },
    { name: 'lastName', description: 'Nom de famille du candidat' },
    { name: 'email', description: 'Adresse email du candidat' },
    { name: 'date', description: 'Date actuelle au format local (jour/mois/année)' },
    { name: 'time', description: 'Heure actuelle au format local (heure:minute:seconde)' },
  ]

  constructor(
    public dialogRef: MatDialogRef<TestsTermsEditorComponent>,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly testsService: TestsService,
    @Inject(MAT_DIALOG_DATA) public data: { courseId: string }
  ) {}

  async ngOnInit(): Promise<void> {
    const test = await firstValueFrom(this.testsService.getTestByCourseId(this.data.courseId))
    this.testId = test.id
    this.terms = test.terms
    this.changeDetectorRef.markForCheck()

    this.dialogRef.beforeClosed().subscribe(async () => {
      if (this.hasUnsavedChanges) {
        await this.saveTerms()
      }
    })

    this.autoSaveIntervalId = setInterval(async () => {
      if (this.hasUnsavedChanges) {
        await this.saveTerms()
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
      await this.saveTerms()
      this.hasUnsavedChanges = false
      this.changeDetectorRef.markForCheck()
    }
    this.dialogRef.close()
  }

  protected onChangeData(data: OutputData): void {
    this.terms = data
    this.hasUnsavedChanges = true
    this.changeDetectorRef.markForCheck()
  }

  private async saveTerms(): Promise<void> {
    await firstValueFrom(this.testsService.updateTestTerms(this.testId, this.terms))
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
