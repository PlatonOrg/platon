import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnChanges } from '@angular/core'
import { ExerciseCorrection, Label } from '@platon/feature/result/common'
import { firstValueFrom } from 'rxjs'
import { ResultService } from '../../api/result.service'
import { ExercisePlayer } from '@platon/feature/player/common'
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { DialogModule } from '@platon/core/browser'
import { CommonModule } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'

@Component({
  standalone: true,
  selector: 'correction-label',
  templateUrl: 'label.component.html',
  styleUrls: ['./label.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NzFormModule,
    NzButtonModule,
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class LabelComponent implements OnChanges {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly fb = inject(NonNullableFormBuilder)

  protected labels: Label[] = []
  protected selectedLabels: Label[] = []
  protected favLabels: Label[] = []
  protected isCreateLabelModalVisible = false
  protected isFavLabelModalVisible = false

  protected animationState = ''

  createLabelForm = this.fb.group({
    labelName: this.fb.control('', [Validators.required]),
    labelDescription: this.fb.control(''),
    labelColor: this.fb.control('#000000'),
  })

  @Input()
  courseId = ''

  @Input()
  currentExercise?: ExerciseCorrection | null = null

  @Input()
  answers: ExercisePlayer[] = []

  constructor(private readonly resultService: ResultService) {}

  async ngOnChanges(): Promise<void> {
    if (this.answers.length === 0 || !this.currentExercise || this.courseId === '') {
      this.selectedLabels = []
      return
    }
    await this.getLabels()
  }

  private async getLabels() {
    const [selectedLabels, favLabels] = await Promise.all([
      firstValueFrom(
        this.resultService.listCorrectionLabels(
          this.currentExercise?.exerciseSessionId ?? '',
          this.answers[this.answers.length - 1].answerId ?? ''
        )
      ),
      firstValueFrom(this.resultService.getFavLabels()),
    ])

    this.selectedLabels = selectedLabels
    this.favLabels = favLabels
    this.labels = await firstValueFrom(this.resultService.getLabels(this.courseId))
    this.changeDetectorRef.markForCheck()
  }

  protected labelize(label: Label): void {
    firstValueFrom(
      this.resultService.labelize(
        this.currentExercise?.exerciseSessionId ?? '',
        this.answers[this.answers.length - 1].answerId ?? '',
        label.id
      )
    )
      .then((e) => (this.selectedLabels = e))
      .catch(console.error)
      .finally(() => this.changeDetectorRef.markForCheck())
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

  //#region Modal management

  protected showCreateLabelModal() {
    this.isCreateLabelModalVisible = true
  }

  protected async handleOk() {
    const newLabel = {
      name: this.createLabelForm.get('labelName')?.value ?? 'Unnamed',
      description: this.createLabelForm.get('labelDescription')?.value,
      color: this.createLabelForm.get('labelColor')?.value ?? '#000000',
    }
    this.isCreateLabelModalVisible = false
    this.labels = await firstValueFrom(this.resultService.createLabel(this.courseId, newLabel))
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

  //#endregion
}
