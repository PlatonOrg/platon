import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core'
import { firstValueFrom } from 'rxjs'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatToolbarModule } from '@angular/material/toolbar'

import { NzBadgeModule } from 'ng-zorro-antd/badge'

import { ExercisePlayer } from '@platon/feature/player/common'
import {
  CorrectionLabelComponent,
  CorrectionResumeTableComponent,
  ResultHistogramComponent,
  ResultService,
} from '@platon/feature/result/browser'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { DialogModule, DialogService, UserService } from '@platon/core/browser'
import { CourseCorrection, ExerciseCorrection, Label } from '@platon/feature/result/common'
import { UiModalTemplateComponent, UiStatisticCardComponent } from '@platon/shared/ui'
import { NzEmptyModule } from 'ng-zorro-antd/empty'
import { PlayerService } from '../../api/player.service'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { PlayerReviewComponent } from '../player-review/player-review.component'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzDividerModule } from 'ng-zorro-antd/divider'
import { MatDividerModule } from '@angular/material/divider'
import { NzGridModule } from 'ng-zorro-antd/grid'
import { NzCollapseModule } from 'ng-zorro-antd/collapse'
import { PlayerCommentsComponent } from '../player-comments/player-comments.component'
import { User } from '@platon/core/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { MatCardModule } from '@angular/material/card'
import { animate, style, transition, trigger } from '@angular/animations'
import { NzProgressModule } from 'ng-zorro-antd/progress'
import { NzModalModule } from 'ng-zorro-antd/modal'

interface ExerciseGroup {
  exerciseId: string
  exerciseName: string
  graded: boolean
  users: ExerciseCorrection[]
}

@Component({
  standalone: true,
  selector: 'player-correction',
  templateUrl: './player-correction.component.html',
  styleUrls: ['./player-correction.component.scss'],
  animations: [
    trigger('swipeAnimation', [
      transition('* => left', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('400ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition('* => right', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('400ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,

    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatDividerModule,
    MatCardModule,

    NzIconModule,
    NzBadgeModule,
    NzEmptyModule,
    NzInputNumberModule,
    NzInputModule,
    NzGridModule,
    NzCollapseModule,
    NzSelectModule,
    NzButtonModule,
    NzProgressModule,
    NzDividerModule,
    NzModalModule,

    DialogModule,

    PlayerReviewComponent,
    PlayerCommentsComponent,
    UiModalTemplateComponent,
    UiStatisticCardComponent,
    CorrectionLabelComponent,
    CorrectionResumeTableComponent,
    ResultHistogramComponent,
  ],
})
export class PlayerCorrectionComponent implements OnInit {
  private readonly dialogService = inject(DialogService)
  private readonly resultService = inject(ResultService)
  private readonly playerService = inject(PlayerService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly userService = inject(UserService)
  private readonly route = inject(ActivatedRoute)

  @ViewChild('GradeCard', { read: ElementRef }) cardRef!: ElementRef<HTMLElement>
  protected isSettingsModalOpen = false
  protected selectedGradeOption = 'platon'
  protected resumeMode = false

  protected activityId = ''
  protected sessionId?: string

  protected answers: ExercisePlayer[] = []

  protected currentGroup?: ExerciseGroup | null = null
  protected currentExercise?: ExerciseCorrection
  protected currentUser?: User | null = null

  protected exerciseGroups: Map<string, ExerciseGroup[]> = new Map()

  protected exercises: ExerciseCorrection[] = []

  protected correctedGrade?: number

  private startIndex = 0
  protected selectedTabIndex = 0
  protected selectedExerciseIndex = 0
  protected exerciseCorrected: Set<string> = new Set()

  protected correction?: CourseCorrection
  protected grade = 0

  protected activityExercisesMap: Map<string, { name: string; map: Map<string, ExerciseGroup> }> = new Map()
  protected userMap: Map<string, User> = new Map()
  protected listExerciseGroup: ExerciseGroup[] = []

  protected currentLabels: Label[] = []

  protected animationState = ''
  protected totalGradeChange?: string
  protected calculatedSteps = 0
  protected correctionResumeList: ExerciseCorrection[] = []
  protected highlightedGrade?: number

  protected gradeOptionMap: Map<string, number | undefined> = new Map([
    ['platon', undefined],
    ['max', 100],
    ['min', 0],
  ])

  @Input() courseCorrection!: CourseCorrection

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe((params) => {
      this.activityId = params.activityId
      this.sessionId = params.sessionId
    })
    this.buildGroups()
    await this.getUsers()
    this.getAllExerciseGroup()
    const firstGroup = this.getSessionId() ?? this.listExerciseGroup[this.startIndex]
    if (firstGroup) {
      this.onChooseGroup(firstGroup)
    }
  }

  private getSessionId(): ExerciseGroup | undefined {
    if (!this.sessionId) {
      return undefined
    }
    for (const group of this.listExerciseGroup) {
      const userIndex = group.users.findIndex((user) => user.exerciseSessionId === this.sessionId)
      if (userIndex > -1) {
        const [user] = group.users.splice(userIndex, 1)
        group.users.unshift(user)
        return group
      }
    }
    return undefined
  }

  private getAllExerciseGroup(): void {
    let counter = 0
    for (const [k, v] of this.activityExercisesMap.entries()) {
      if (this.activityId === k) {
        this.startIndex = counter
      }
      for (const group of v.map.values()) {
        this.listExerciseGroup.push(group)
        counter++
      }
    }
  }

  private buildGroups(): void {
    const activityExercisesMap = new Map<string, { name: string; map: Map<string, ExerciseGroup> }>()

    for (const activity of this.courseCorrection.ActivityCorrections) {
      const exercisesMap = new Map<string, ExerciseGroup>()
      for (const exercise of activity.exercises) {
        if (!exercisesMap.has(exercise.exerciseId)) {
          exercisesMap.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            graded: exercise.correctedGrade != null,
            users: [exercise],
          })
        } else {
          const group = exercisesMap.get(exercise.exerciseId)
          if (group) {
            group.users.push(exercise)
            group.graded = exercise.correctedGrade != null && group.graded
          }
        }
      }
      activityExercisesMap.set(activity.activityId, { name: activity.activityName, map: exercisesMap })
    }

    this.activityExercisesMap = activityExercisesMap
    this.changeDetectorRef.markForCheck()
  }

  protected async loadAnswers(exercise: ExerciseCorrection): Promise<void> {
    this.currentExercise = exercise
    const initialGrade = exercise.correctedGrade ?? this.gradeOptionMap.get(this.selectedGradeOption) ?? exercise.grade
    this.correctedGrade = Math.max(0, Math.min(100, initialGrade ?? 0))
    if (exercise.exerciseSessionId) {
      this.answers = (
        await firstValueFrom(
          this.playerService.playAnswers({
            sessionId: exercise.exerciseSessionId,
          })
        )
      ).exercises
    }
    this.currentUser = this.userMap.get(this.currentExercise?.userId as string)
    this.changeDetectorRef.markForCheck()
  }

  protected onChooseTab(index: number): void {
    const currentUserId = this.currentExercise?.userId
    this.answers = []
    this.selectedTabIndex = index
    this.currentExercise = undefined
    this.exercises = this.currentGroup?.users || []
    this.exercises.sort((a, b) => {
      const aName = this.userMap.get(a.userId)?.username
      const bName = this.userMap.get(b.userId)?.username
      return aName?.localeCompare(bName ?? '') ?? 0
    })
    // Take the current user's exercise if it exists
    let exerciseIndex = this.exercises.findIndex((exercise) => exercise.userId === currentUserId)
    if (exerciseIndex == -1) {
      exerciseIndex = 0
    }
    this.onChooseExercise(exerciseIndex).catch(console.error)
  }

  protected onChooseGroup(group: ExerciseGroup): void {
    if (this.currentGroup === group) {
      return
    }
    this.correctionResumeList = []
    this.currentGroup = group
    this.exerciseCorrected.clear()
    for (const exercise of this.currentGroup.users) {
      if (exercise.correctedGrade != null) {
        this.exerciseCorrected.add(exercise.exerciseSessionId)
        this.correctionResumeList.push(exercise)
      }
    }
    this.onChooseTab(this.selectedTabIndex)
  }

  protected async onChooseExercise(index: number): Promise<void> {
    this.selectedExerciseIndex = (index + this.exercises.length) % this.exercises.length
    const exercise = this.exercises[this.selectedExerciseIndex]
    if (exercise) {
      await this.loadAnswers(exercise)
    }
    this.changeDetectorRef.markForCheck()
  }

  protected async onChooseNextUserExercise(): Promise<void> {
    await this.onChooseExercise(this.selectedExerciseIndex + 1)
  }

  protected async onChoosePreviousUserExercise(): Promise<void> {
    await this.onChooseExercise(this.selectedExerciseIndex - 1)
  }

  private async getUsers() {
    const userIds = new Set<string>()
    for (const activity of this.courseCorrection.ActivityCorrections) {
      for (const exercise of activity.exercises) {
        userIds.add(exercise.userId)
      }
    }
    const users = await firstValueFrom(this.userService.findAllByUserNames([...userIds]))
    for (const user of users) {
      this.userMap.set(user.id, user)
    }
    this.changeDetectorRef.markForCheck()
  }

  get userOptions() {
    return (
      this.currentGroup?.users?.map((user) => ({
        label: this.userMap.get(user.userId)?.firstName + ' ' + this.userMap.get(user.userId)?.lastName,
        value: user.userId,
      })) ?? []
    )
  }

  protected loadUserExercise(userId: string) {
    const exercise = this.currentGroup?.users.find((exercise) => exercise.userId === userId)
    if (exercise) {
      this.onChooseExercise(this.exercises.indexOf(exercise)).catch(console.error)
    }
  }

  private parseGradeChange(totalGradeChange: string, baseGrade: number): number {
    if (!totalGradeChange) {
      return baseGrade
    }

    let value = 0
    let coef = 0

    if (totalGradeChange.startsWith('+') || totalGradeChange.startsWith('-')) {
      coef = totalGradeChange.startsWith('+') ? 1 : -1
      value = parseInt(totalGradeChange.slice(1), 10)
      if (isNaN(value) || value === 0) {
        return baseGrade
      } else {
        return Math.max(0, Math.min(100, baseGrade + coef * value))
      }
    } else {
      value = parseInt(totalGradeChange, 10)
      if (!isNaN(value)) {
        return Math.max(0, Math.min(100, value))
      }
    }

    return baseGrade
  }

  protected onTotalGradeChange(totalGradeChange: string) {
    if (!this.currentExercise) {
      return
    }

    const baseGrade = this.currentExercise.grade ?? 0
    this.correctedGrade = this.parseGradeChange(totalGradeChange, baseGrade)
    this.changeDetectorRef.markForCheck()
  }

  @HostListener('window:keydown', ['$event'])
  protected async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const active = document.activeElement
    // On ignore si le focus est sur un input, textarea ou contenteditable
    if (
      (active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) ||
      this.resumeMode
    ) {
      return
    }

    switch (event.key) {
      case 'ArrowLeft':
        await this.onChoosePreviousUserExercise()
        this.animationState = 'left'
        setTimeout(() => {
          this.animationState = ''
        }, 400)
        break
      case 'ArrowRight':
        await this.onSaveGrade()
        await this.onChooseNextUserExercise()
        this.animationState = 'right'
        setTimeout(() => {
          this.animationState = ''
        }, 400)
        break
      case 'ArrowUp':
        event.preventDefault()
        this.onChooseGroup(
          this.listExerciseGroup[Math.max(0, this.listExerciseGroup.indexOf(this.currentGroup as ExerciseGroup) - 1)]
        )
        break
      case 'ArrowDown':
        event.preventDefault()
        this.onChooseGroup(
          this.listExerciseGroup[
            Math.min(
              this.listExerciseGroup.length,
              this.listExerciseGroup.indexOf(this.currentGroup as ExerciseGroup) + 1
            )
          ]
        )
        break
    }
  }

  protected async setGradeOnClick(event: Event, grade: number) {
    // eslint-disable-next-line prettier/prettier
    (event.target as HTMLInputElement).blur()
    // Appliquer les limites 0-100 avant d'assigner
    this.correctedGrade = Math.max(0, Math.min(100, grade))
    await this.onSaveGrade()
  }

  protected async onSaveGrade() {
    if (this.currentExercise) {
      try {
        // S'assurer que la note est dans les limites 0-100 avant de sauvegarder
        const validatedGrade = Math.max(0, Math.min(100, this.correctedGrade as number))
        this.correctedGrade = validatedGrade

        await firstValueFrom(
          this.resultService.upsertCorrection(this.currentExercise.exerciseSessionId, {
            grade: validatedGrade,
            labels: this.currentLabels.map((label) => {
              return {
                labelId: label.id,
                sessionId: this.currentExercise?.exerciseSessionId ?? '',
                answerId: this.answers[this.answers.length - 1].answerId ?? '',
              }
            }),
          })
        )
        this.currentExercise.correctedGrade = validatedGrade
        if (this.exerciseCorrected.has(this.currentExercise.exerciseSessionId)) {
          const index = this.correctionResumeList.findIndex(
            (exercise) => exercise.exerciseSessionId === this.currentExercise?.exerciseSessionId
          )
          if (index !== -1) {
            this.correctionResumeList[index] = this.currentExercise
          }
        } else {
          this.correctionResumeList.push(this.currentExercise)
        }
        this.exerciseCorrected.add(this.currentExercise.exerciseSessionId)
      } catch {
        this.dialogService.error('Une erreur est survenue lors de la sauvegarde de la note.')
      }
    }
  }

  protected trackByExerciseId(_: number, group: ExerciseGroup): string {
    return group.exerciseId
  }

  protected get currentActivityId(): string | undefined {
    for (const [activityId, { map }] of this.activityExercisesMap.entries()) {
      if (map.has(this.currentGroup?.exerciseId ?? '')) {
        return activityId
      }
    }
    return undefined
  }
  get correctionGrades(): number[] {
    return this.correctionResumeList.map((exercise) => exercise.correctedGrade ?? exercise.grade ?? 0)
  }
  get correctionGradesMean(): number {
    const grades = this.correctionGrades
    if (grades.length === 0) {
      return 0
    }
    const sum = grades.reduce((acc, grade) => acc + grade, 0)
    return sum / grades.length
  }

  get standardDeviation(): number {
    const grades = this.correctionGrades
    if (grades.length === 0) {
      return 0
    }
    const mean = this.correctionGradesMean
    const variance = grades.reduce((acc, grade) => acc + Math.pow(grade - mean, 2), 0) / grades.length
    return Math.sqrt(variance)
  }

  protected onGradeAdjustmentChange(event: { userId: string; adjustment: number }): void {
    if (!this.currentExercise) {
      return
    }
    const exercise = this.currentGroup?.users.find((ex) => ex.userId === event.userId)
    if (exercise && exercise.correctedGrade) {
      // Appliquer les limites 0-100 lors de l'ajustement
      exercise.correctedGrade = Math.max(0, Math.min(100, exercise.correctedGrade + event.adjustment))
      if (this.exerciseCorrected.has(exercise.exerciseSessionId)) {
        const index = this.correctionResumeList.findIndex((ex) => ex.exerciseSessionId === exercise.exerciseSessionId)
        if (index !== -1) {
          this.correctionResumeList[index] = exercise
        }
      } else {
        this.correctionResumeList.push(exercise)
      }
      this.changeDetectorRef.markForCheck()
    }
  }

  protected onCorrectionsResumeDone(corrections: ExerciseCorrection[]): void {
    this.correctionResumeList = corrections
    this.changeDetectorRef.markForCheck()
  }

  protected onCurrentLabelsChange(labels: Label[]): void {
    this.currentLabels = labels
    if (this.currentExercise) {
      this.currentExercise.labels = labels
    }
    this.changeDetectorRef.markForCheck()
  }

  protected onLabelGradeChange(labelGrade: Map<string, string>): void {
    // Create a new array to trigger change detection
    this.correctionResumeList = this.correctionResumeList.map((exercise) => {
      const updatedExercise = { ...exercise, labels: [...exercise.labels] }

      // Update label grade changes
      updatedExercise.labels.forEach((label) => {
        if (labelGrade.has(label.id)) {
          label.gradeChange = labelGrade.get(label.id)
        }
      })

      // Use the original grade as base for calculation
      const originalGrade = exercise.grade ?? 0
      updatedExercise.correctedGrade = this.computeGradeChange(updatedExercise.labels, originalGrade)

      return updatedExercise
    })

    this.changeDetectorRef.markForCheck()
  }

  private computeGradeChange(labelList: Label[], originalGrade?: number): number | undefined {
    if (originalGrade === undefined) return undefined

    let totalGradeChange = 0
    let hasAbsoluteGrade = false
    let absoluteGrade = 0

    // Process all labels to calculate the final grade change
    labelList.forEach((label) => {
      const gradeChange = label.gradeChange
      if (gradeChange) {
        if (gradeChange.startsWith('+') || gradeChange.startsWith('-')) {
          // Relative grade change
          const sign = gradeChange.startsWith('+') ? 1 : -1
          const value = parseInt(gradeChange.slice(1))
          if (!isNaN(value)) {
            totalGradeChange += sign * value
          }
        } else {
          // Absolute grade change - use the last absolute grade found
          const value = parseInt(gradeChange)
          if (!isNaN(value)) {
            hasAbsoluteGrade = true
            absoluteGrade = value
          }
        }
      }
    })
    let finalGrade: number
    if (hasAbsoluteGrade) {
      finalGrade = absoluteGrade
    } else {
      finalGrade = originalGrade + totalGradeChange
    }

    // Ensure grade is within valid bounds (0-100)
    return Math.max(0, Math.min(100, finalGrade))
  }
}
