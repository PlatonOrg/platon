import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnInit,
  inject,
} from '@angular/core'
import { firstValueFrom } from 'rxjs'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatToolbarModule } from '@angular/material/toolbar'

import { NzBadgeModule } from 'ng-zorro-antd/badge'

import { ExercisePlayer } from '@platon/feature/player/common'
import { LabelComponent, ResultService } from '@platon/feature/result/browser'

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
import { MatDividerModule } from '@angular/material/divider'
import { NzGridModule } from 'ng-zorro-antd/grid'
import { NzCollapseModule } from 'ng-zorro-antd/collapse'
import { PlayerCommentsComponent } from '../player-comments/player-comments.component'
import { User } from '@platon/core/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { MatCardModule } from '@angular/material/card'
import { animate, style, transition, trigger } from '@angular/animations'

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

    DialogModule,

    PlayerReviewComponent,
    PlayerCommentsComponent,
    UiModalTemplateComponent,
    UiStatisticCardComponent,
    LabelComponent,
  ],
})
export class PlayerCorrectionComponent implements OnInit {
  private readonly dialogService = inject(DialogService)
  private readonly resultService = inject(ResultService)
  private readonly playerService = inject(PlayerService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly userService = inject(UserService)
  private readonly route = inject(ActivatedRoute)

  protected activityId?: string
  protected userId?: string

  protected answers: ExercisePlayer[] = []

  protected currentGroup?: ExerciseGroup | null = null
  protected currentExercise?: ExerciseCorrection | null = null
  protected currentUser?: User | null = null

  protected exerciseGroups: Map<string, ExerciseGroup[]> = new Map()

  protected exercises: ExerciseCorrection[] = []

  protected correctedGrade?: number

  private startIndex = 0
  protected selectedTabIndex = 0
  protected selectedExerciseIndex = 0

  protected correction?: CourseCorrection
  protected grade = 0

  protected activityExercisesMap: Map<string, { name: string; map: Map<string, ExerciseGroup> }> = new Map()
  protected userMap: Map<string, User> = new Map()
  protected listExerciseGroup: ExerciseGroup[] = []

  protected labels: Label[] = []
  protected currentLabels: Label[] = []

  protected animationState = ''

  @Input() courseCorrection!: CourseCorrection

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe((params) => {
      this.activityId = params.activityId
      this.userId = params.userId
    })
    this.buildGroups()
    await this.getUsers()
    this.getAllExerciseGroup()
    const firstGroup = this.listExerciseGroup[this.startIndex]
    if (firstGroup) {
      this.onChooseGroup(firstGroup)
    }
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
    this.correctedGrade = exercise.correctedGrade ?? exercise.grade
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
    this.currentExercise = null
    this.exercises = this.currentGroup?.users || []
    this.exercises.sort((a, b) => {
      const aName = this.userMap.get(a.userId)?.username
      const bName = this.userMap.get(b.userId)?.username
      return aName?.localeCompare(bName ?? '') ?? 0
    })
    // Set the selected exercise to the same index as the current group if it is from the same user
    if (this.exercises.at(this.selectedExerciseIndex)?.userId === currentUserId) {
      this.onChooseExercise(this.selectedExerciseIndex).catch(console.error)
      return
    }
    this.onChooseExercise(0).catch(console.error)
  }

  protected onChooseGroup(group: ExerciseGroup): void {
    this.currentGroup = group
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

  protected changeGrade() {
    console.error('changeGrade', this.correctedGrade)
  }

  @HostListener('window:keydown', ['$event'])
  protected async handleKeyDown(event: KeyboardEvent): Promise<void> {
    switch (event.key) {
      case 'ArrowLeft':
        await this.onChoosePreviousUserExercise()
        this.animationState = 'left'
        setTimeout(() => {
          this.animationState = ''
        }, 400)
        break
      case 'ArrowRight':
        await this.onChooseNextUserExercise()
        this.animationState = 'right'
        setTimeout(() => {
          this.animationState = ''
        }, 400)
        break
      case 'ArrowUp':
        event.preventDefault()
        this.onChooseGroup(
          this.listExerciseGroup[this.listExerciseGroup.indexOf(this.currentGroup as ExerciseGroup) - 1]
        )
        break
      case 'ArrowDown':
        event.preventDefault()
        this.onChooseGroup(
          this.listExerciseGroup[this.listExerciseGroup.indexOf(this.currentGroup as ExerciseGroup) + 1]
        )
        break
    }

    const gradeMap: { [key: string]: number } = {
      IntlBackslash: 0,
      Digit1: 10,
      Digit2: 20,
      Digit3: 30,
      Digit4: 40,
      Digit5: 50,
      Digit6: 60,
      Digit7: 70,
      Digit8: 80,
      Digit9: 90,
      Digit0: 100,
    }

    if (event.code in gradeMap) {
      this.correctedGrade = gradeMap[event.code]
      await this.onSaveGrade()
    }
  }

  protected async setGradeOnClick(event: Event, grade: number) {
    // eslint-disable-next-line prettier/prettier
    (event.target as HTMLInputElement).blur()
    this.correctedGrade = grade
    await this.onSaveGrade()
  }

  protected async onSaveGrade() {
    if (this.currentExercise && this.currentExercise != null) {
      try {
        await firstValueFrom(
          this.resultService.upsertCorrection(this.currentExercise.exerciseSessionId, {
            grade: this.correctedGrade as number,
          })
        )
        this.currentExercise.correctedGrade = this.correctedGrade
        // this.buildGroups()
        // this.onChooseTab(this.selectedTabIndex)
        await this.onChooseNextUserExercise()
        this.dialogService.success('La note a été sauvegardée avec succès.')
      } catch {
        this.dialogService.error('Une erreur est survenue lors de la sauvegarde de la note.')
      }
    }
  }

  protected trackByExerciseId(_: number, group: ExerciseGroup): string {
    return group.exerciseId
  }
}
