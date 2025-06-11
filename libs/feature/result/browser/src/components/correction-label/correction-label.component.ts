import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  Output,
} from '@angular/core'
import { ExerciseCorrection, Label } from '@platon/feature/result/common'
import { firstValueFrom } from 'rxjs'
import { ResultService } from '../../api/result.service'
import { ExercisePlayer } from '@platon/feature/player/common'
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { DialogModule, DialogService } from '@platon/core/browser'
import { CommonModule } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { NzListModule } from 'ng-zorro-antd/list'
import { NzInputModule } from 'ng-zorro-antd/input'
import { FormGroup } from '@angular/forms'

@Component({
  standalone: true,
  selector: 'correction-label',
  templateUrl: 'correction-label.component.html',
  styleUrls: ['./correction-label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,

    NzFormModule,
    NzButtonModule,
    NzListModule,
    NzInputModule,

    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class CorrectionLabelComponent implements OnChanges {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly dialogService = inject(DialogService)

  protected labels: Label[] = []
  protected selectedLabels: Label[] = []
  protected favLabels: Label[] = []
  protected isCreateLabelModalVisible = false
  protected isFavLabelModalVisible = false
  protected labelGrade?: string
  protected labelGradeMap: Map<string, string> = new Map()

  protected animationState = ''

  createLabelForm = this.fb.group({
    labelName: this.fb.control('', [Validators.required]),
    labelDescription: this.fb.control(''),
    labelColor: this.fb.control('#000000'),
    gradeChange: this.fb.control('', [Validators.required, Validators.maxLength(4)]),
  })

  @Input()
  activityId?: string

  @Input()
  currentExercise?: ExerciseCorrection

  @Input()
  navigationExerciseId?: string

  @Input()
  resumeMode = false

  @Input()
  answers: ExercisePlayer[] = []

  @Output()
  totalGradeChange = new EventEmitter<string>()

  @Output()
  currentLabelsChange = new EventEmitter<Label[]>()

  @Output()
  labelGradeChange = new EventEmitter<Map<string, string>>()

  protected editingLabelId: string | null = null
  protected labelForms: { [labelId: string]: FormGroup } = {}

  constructor(private readonly resultService: ResultService) {}

  async ngOnChanges(): Promise<void> {
    if (this.answers.length === 0 || !this.navigationExerciseId) {
      this.selectedLabels = []
      return
    }
    await this.getLabels()
    this.changeDetectorRef.markForCheck()
  }

  private async getLabels() {
    if (
      !this.activityId ||
      !this.navigationExerciseId ||
      this.answers.length === 0 ||
      !this.currentExercise?.exerciseSessionId
    ) {
      return
    }
    const [selectedLabels, favLabels] = await Promise.all([
      firstValueFrom(
        this.resultService.listCorrectionLabels(
          this.currentExercise?.exerciseSessionId,
          this.answers[this.answers.length - 1].answerId ?? ''
        )
      ),
      firstValueFrom(this.resultService.getFavLabels()),
    ])

    this.selectedLabels = selectedLabels
    this.currentLabelsChange.emit(this.selectedLabels)
    this.favLabels = favLabels
    this.labels = await firstValueFrom(this.resultService.getLabels(this.navigationExerciseId))
    // Crée un formulaire pour chaque label
    this.labels.forEach((label) => {
      this.labelForms[label.id] = this.fb.group({
        name: this.fb.control(label.name, [Validators.required]),
        description: this.fb.control(label.description ?? ''),
        gradeChange: this.fb.control(this.labelGradeMap.get(label.id) ?? label.gradeChange, [
          Validators.maxLength(4),
          Validators.pattern(/^[+-]?\d*$/),
        ]),
      })
    })
    this.changeDetectorRef.markForCheck()
  }

  protected labelize(label: Label): void {
    if (!this.currentExercise || !this.answers || !label.id) {
      console.error('Cannot labelize: missing currentExercise?.exerciseSessionId, answers, label.id')
      return
    }
    if (this.resumeMode) return

    this.selectedLabels.find((l) => l.id === label.id)
      ? (this.selectedLabels = this.selectedLabels.filter((l) => l.id !== label.id))
      : this.selectedLabels.push(label)
    this.currentLabelsChange.emit(this.selectedLabels)
    this.computeGradeChange()
  }

  isLabelSelected(label: Label): boolean {
    return this.selectedLabels?.some((l) => l.id === label.id)
  }

  isLabelFav(label: Label): boolean {
    return this.favLabels?.some((l) => l.id === label.id)
  }

  getLabelStyles(label: Label): { [key: string]: string } {
    const isSelected = this.isLabelSelected(label)
    return {
      color: isSelected ? label.color ?? 'blue' : 'black',
      'border-color': isSelected ? label.color ?? 'blue' : 'black',
      'font-weight': isSelected ? 'bold' : 'normal',
      'border-radius': isSelected ? '5px' : '0px',
    }
  }

  getLabelInputStyles(label: Label): { [key: string]: string } {
    if (label.gradeChange?.startsWith('+') && label.gradeChange.length > 1) {
      return {
        color: 'green',
        'font-weight': 'bold',
      }
    } else if (label.gradeChange?.startsWith('-') && label.gradeChange.length > 1) {
      return {
        color: 'red',
        'font-weight': 'bold',
      }
    }
    return {
      color: 'black',
      'font-weight': 'normal',
    }
  }

  deleteLabel(label: Label) {
    if (!this.activityId || !label.id) {
      return
    }
    firstValueFrom(this.resultService.deleteLabel(label.id))
      .then(() => {
        this.changeDetectorRef.markForCheck()
      })
      .catch(() => {
        this.dialogService.warning(
          `Le label "${label.name}" est utilisé sur des réponses et ne peut pas être supprimé.`
        )
      })
      .finally(async () => {
        await this.getLabels()
      })
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const active = document.activeElement
    // On ignore si le focus est sur un input, textarea ou contenteditable
    if (
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)
    ) {
      return
    }

    const gradeMap: { [key: string]: number } = {
      Digit0: 0,
      Digit1: 1,
      Digit2: 2,
      Digit3: 3,
      Digit4: 4,
      Digit5: 5,
      Digit6: 6,
      Digit7: 7,
      Digit8: 8,
      Digit9: 9,
    }

    const key = event.code
    const index = gradeMap[key]
    if (index === undefined) {
      return
    }

    if (index >= 0 && index < this.labels.length) {
      this.labelize(this.labels[index])
    }
  }

  //#region Modal management

  protected showCreateLabelModal() {
    this.isCreateLabelModalVisible = true
  }

  protected async handleOk() {
    if (this.activityId === undefined || this.navigationExerciseId === undefined) {
      return
    }
    const newLabel = {
      name: this.createLabelForm.get('labelName')?.value ?? 'Unnamed',
      description: this.createLabelForm.get('labelDescription')?.value,
      color: this.createLabelForm.get('labelColor')?.value ?? '#000000',
    }
    this.isCreateLabelModalVisible = false
    await firstValueFrom(this.resultService.createLabel(this.activityId, this.navigationExerciseId, newLabel))
    await this.getLabels()
    this.changeDetectorRef.markForCheck()
  }

  protected handleCancel() {
    this.isCreateLabelModalVisible = false
  }

  protected showFavLabelModal() {
    this.isFavLabelModalVisible = true
  }

  protected async handleFavOk() {
    //
    this.changeDetectorRef.markForCheck()
  }

  protected handleFavCancel() {
    this.isFavLabelModalVisible = false
  }

  protected async addOrRemoveToFav(label: Label, event: MouseEvent) {
    event.stopPropagation()
    if (this.isLabelFav(label)) {
      this.favLabels = await firstValueFrom(this.resultService.unfavLabel(label.id))
    } else {
      this.favLabels = await firstValueFrom(this.resultService.favLabel(label.id))
    }
    this.changeDetectorRef.markForCheck()
  }

  private computeGradeChange() {
    let totalGradeChange = 0
    let hasEmitted = false

    this.selectedLabels.forEach((label) => {
      const gradeChange = this.labelGradeMap.get(label.id) ?? label.gradeChange
      if (gradeChange) {
        if (gradeChange.startsWith('+') || gradeChange.startsWith('-')) {
          const sign = gradeChange.startsWith('+') ? 1 : -1
          const value = parseInt(gradeChange.slice(1))
          if (!isNaN(value)) {
            totalGradeChange += sign * value
          }
        } else {
          // If gradeChange does not start with + or -, emit it directly
          this.totalGradeChange.emit(gradeChange)
          hasEmitted = true
        }
      }
    })

    if (!hasEmitted) {
      this.totalGradeChange.emit(totalGradeChange >= 0 ? `+${totalGradeChange}` : `${totalGradeChange}`)
    }
  }

  protected startEditLabel(label: Label) {
    this.editingLabelId = label.id
    this.labelForms[label.id].setValue({
      name: label.name,
      description: label.description,
      gradeChange: this.labelGradeMap.get(label.id) ?? label.gradeChange,
    })
  }

  protected cancelEditLabel() {
    this.editingLabelId = null
  }

  protected async saveEditLabel(label: Label) {
    if (!this.navigationExerciseId) return
    const form = this.labelForms[label.id]
    const gradeChangeControl = form.get('gradeChange')
    if (gradeChangeControl && gradeChangeControl.invalid) {
      gradeChangeControl.setValue('+0')
      gradeChangeControl.markAsPristine()
      return
    }
    this.labelGradeMap.set(label.id, form.get('gradeChange')?.value)
    this.labelGradeChange.emit(this.labelGradeMap)
    if (form.invalid) return
    const updated = {
      ...label,
      name: form.get('name')?.value,
      description: form.get('description')?.value,
      gradeChange: form.get('gradeChange')?.value,
    }
    await firstValueFrom(this.resultService.updateLabel(updated, this.navigationExerciseId))
    await this.getLabels()
    this.computeGradeChange()
    this.editingLabelId = null
  }

  //#endregion
}
