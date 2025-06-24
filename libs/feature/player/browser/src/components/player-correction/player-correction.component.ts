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
import { GRADE_BOUNDS, GRADE_OPTIONS, PlayerCorrectionService } from './player-correction.service'
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
  // === SERVICES ===
  private readonly dialogService = inject(DialogService)
  private readonly resultService = inject(ResultService)
  private readonly playerService = inject(PlayerService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly userService = inject(UserService)
  private readonly route = inject(ActivatedRoute)

  // === VIEW REFERENCES ===
  @ViewChild('GradeCard', { read: ElementRef }) cardRef!: ElementRef<HTMLElement>

  // === COMPONENT STATE ===
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
  protected gradeAdjustments = new Map<string, number>()

  // === CONFIGURATION ===
  protected gradeOptionMap: Map<string, number | undefined> = new Map([
    [GRADE_OPTIONS.PLATON, undefined],
    [GRADE_OPTIONS.MAX, GRADE_BOUNDS.MAX],
    [GRADE_OPTIONS.MIN, GRADE_BOUNDS.MIN],
  ])

  @Input() courseCorrection!: CourseCorrection

  // === LIFECYCLE ===
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

  // === SESSION MANAGEMENT ===
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

  // === GROUP BUILDING ===
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

  // === EXERCISE LOADING ===
  protected async loadAnswers(exercise: ExerciseCorrection): Promise<void> {
    this.currentExercise = exercise
    const initialGrade = exercise.correctedGrade ?? this.gradeOptionMap.get(this.selectedGradeOption) ?? exercise.grade
    this.correctedGrade = PlayerCorrectionService.validateGrade(initialGrade ?? 0)
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

  // === NAVIGATION METHODS ===
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

  // === UTILITY METHODS ===
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

  // === GETTERS ===
  get userOptions(): Array<{ label: string; value: string }> {
    return (
      this.currentGroup?.users?.map((user) => ({
        label: `${this.userMap.get(user.userId)?.firstName} ${this.userMap.get(user.userId)?.lastName}`,
        value: user.userId,
      })) ?? []
    )
  }

  // === USER EXERCISE MANAGEMENT ===
  protected loadUserExercise(userId: string): void {
    const exercise = this.currentGroup?.users.find((exercise) => exercise.userId === userId)
    if (exercise) {
      this.onChooseExercise(this.exercises.indexOf(exercise)).catch(console.error)
    }
  }

  protected onTotalGradeChange(totalGradeChange: string) {
    if (!this.currentExercise) {
      return
    }

    const baseGrade = this.gradeOptionMap.get(this.selectedGradeOption) ?? this.currentExercise.grade ?? 0
    this.correctedGrade = PlayerCorrectionService.parseGradeChange(totalGradeChange, baseGrade)
    this.changeDetectorRef.markForCheck()
  }

  // === EVENT HANDLERS ===
  @HostListener('window:keydown', ['$event'])
  protected async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const active = document.activeElement
    // On ignore si le focus est sur un input, textarea ou contenteditable
    if (
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)
    ) {
      return
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (this.resumeMode) {
          this.resumeMode = false
          this.changeDetectorRef.markForCheck()
          return
        }
        await this.onChoosePreviousUserExercise()
        this.animationState = 'left'
        setTimeout(() => {
          this.animationState = ''
        }, 400)
        break
      case 'ArrowRight':
        await this.onSaveGrade()
        if (
          this.selectedExerciseIndex === this.exercises.length - 1 &&
          this.exerciseCorrected.size === this.exercises.length
        ) {
          this.resumeMode = true
          this.changeDetectorRef.markForCheck()
          return
        }
        await this.onChooseNextUserExercise()
        this.animationState = 'right'
        setTimeout(() => {
          this.animationState = ''
        }, 400)
        break
      case 'ArrowUp':
        if (this.resumeMode) return
        event.preventDefault()
        this.onChooseGroup(
          this.listExerciseGroup[Math.max(0, this.listExerciseGroup.indexOf(this.currentGroup as ExerciseGroup) - 1)]
        )
        break
      case 'ArrowDown':
        if (this.resumeMode) return
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

  protected async onSaveGrade() {
    if (this.currentExercise) {
      try {
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
    this.gradeAdjustments.set(event.userId, event.adjustment)
    const exercise = this.currentGroup?.users.find((ex) => ex.userId === event.userId)
    if (exercise && exercise.correctedGrade) {
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
      updatedExercise.correctedGrade = PlayerCorrectionService.computeGradeChange(
        updatedExercise.labels,
        originalGrade,
        this.gradeAdjustments.get(updatedExercise.userId)
      )

      return updatedExercise
    })
    // Update the current exercise if it matches
    if (this.currentGroup) {
      const exercise = this.currentGroup.users.find(
        (ex) => ex.exerciseSessionId === this.currentExercise?.exerciseSessionId
      )
      if (exercise) {
        exercise.correctedGrade = PlayerCorrectionService.computeGradeChange(
          exercise.labels,
          exercise.grade,
          this.gradeAdjustments.get(exercise.userId)
        )
      }
    }
    this.changeDetectorRef.markForCheck()
  }
}
