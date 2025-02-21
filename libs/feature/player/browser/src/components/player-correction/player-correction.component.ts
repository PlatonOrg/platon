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
import { ResultService } from '@platon/feature/result/browser'

import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { RouterModule } from '@angular/router'
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
import { NzFormModule } from 'ng-zorro-antd/form'

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

    NzIconModule,
    NzBadgeModule,
    NzEmptyModule,
    NzInputNumberModule,
    NzInputModule,
    NzGridModule,
    NzCollapseModule,
    NzSelectModule,
    NzButtonModule,
    NzFormModule,

    DialogModule,

    PlayerReviewComponent,
    PlayerCommentsComponent,
    UiModalTemplateComponent,
    UiStatisticCardComponent,
  ],
})
export class PlayerCorrectionComponent implements OnInit {
  private readonly dialogService = inject(DialogService)
  private readonly resultService = inject(ResultService)
  private readonly playerService = inject(PlayerService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly userService = inject(UserService)
  private readonly fb = inject(NonNullableFormBuilder)

  protected answers: ExercisePlayer[] = []

  protected currentGroup?: ExerciseGroup | null = null
  protected currentExercise?: ExerciseCorrection | null = null
  protected currentUser?: User | null = null

  protected exerciseGroups: Map<string, ExerciseGroup[]> = new Map()

  protected exercises: ExerciseCorrection[] = []

  protected correctedGrade?: number

  protected selectedTabIndex = 0
  protected selectedExerciseIndex = 0

  protected correction?: CourseCorrection
  protected grade = 0

  protected activityExercisesMap: Map<string, { name: string; map: Map<string, ExerciseGroup> }> = new Map()
  protected userMap: Map<string, User> = new Map()
  protected listExerciseGroup: ExerciseGroup[] = []

  protected labels: Label[] = []
  protected isCreateLabelModalVisible = false

  createLabelForm = this.fb.group({
    labelName: this.fb.control('', [Validators.required]),
    labelDescription: this.fb.control(''),
    labelColor: this.fb.control('#000000'),
  })

  @Input() courseCorrection!: CourseCorrection

  async ngOnInit(): Promise<void> {
    this.buildGroups()
    await this.getUsers()
    await this.getLabels()
    this.getAllExerciseGroup()
    const firstGroup = this.listExerciseGroup[0]
    if (firstGroup) {
      this.onChooseGroup(firstGroup)
    }
  }

  private getAllExerciseGroup(): void {
    for (const activity of this.activityExercisesMap.values()) {
      for (const group of activity.map.values()) {
        this.listExerciseGroup?.push(group)
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
    this.answers = []
    this.selectedTabIndex = index
    this.currentExercise = null
    this.exercises =
      this.currentGroup?.users?.filter((exercise) => {
        return index === 0 ? exercise.correctedGrade == null : exercise.correctedGrade != null
      }) || []
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

  private async getLabels() {
    this.labels = await firstValueFrom(this.resultService.getLabels())
    this.changeDetectorRef.markForCheck()
  }

  protected async labelize(labelId: string) {
    console.error('labelId', labelId)
    await firstValueFrom(
      this.resultService.labelize(
        this.currentExercise?.exerciseSessionId ?? '',
        this.answers[this.answers.length - 1].answerId ?? '',
        labelId
      )
    )
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
    this.labels = await firstValueFrom(this.resultService.createLabel('id', newLabel))
    this.changeDetectorRef.markForCheck()
  }

  protected handleCancel() {
    this.isCreateLabelModalVisible = false
  }

  @HostListener('window:keydown', ['$event'])
  protected async handleKeyDown(event: KeyboardEvent): Promise<void> {
    switch (event.key) {
      case 'ArrowLeft':
        await this.onChoosePreviousUserExercise()
        break
      case 'ArrowRight':
        await this.onChooseNextUserExercise()
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

    switch (event.code) {
      case 'IntlBackslash':
        this.correctedGrade = 0
        break
      case 'Digit1':
        this.correctedGrade = 10
        break
      case 'Digit2':
        this.correctedGrade = 20
        break
      case 'Digit3':
        this.correctedGrade = 30
        break
      case 'Digit4':
        this.correctedGrade = 40
        break
      case 'Digit5':
        this.correctedGrade = 50
        break
      case 'Digit6':
        this.correctedGrade = 60
        break
      case 'Digit7':
        this.correctedGrade = 70
        break
      case 'Digit8':
        this.correctedGrade = 80
        break
      case 'Digit9':
        this.correctedGrade = 90
        break
      case 'Digit0':
        this.correctedGrade = 100
        break
    }
  }

  // protected onChoosePreviousExercise(): void {
  //   this.onChooseExercise(this.selectedExerciseIndex - 1).catch(console.error)
  // }

  // protected onChooseNextExercise(): void {
  //   this.onChooseExercise(this.selectedExerciseIndex + 1).catch(console.error)
  // }

  // protected async onSaveGrade(): Promise<void> {
  //   if (this.currentExercise && this.currentExercise != null) {
  //     try {
  //       await firstValueFrom(
  //         this.resultService.upsertCorrection(this.currentExercise.exerciseSessionId, {
  //           grade: this.correctedGrade as number,
  //         })
  //       )
  //       this.currentExercise.correctedGrade = this.correctedGrade
  //       this.buildGroups()
  //       this.onChooseTab(this.selectedTabIndex)
  //       this.dialogService.success('La note a été sauvegardée avec succès.')
  //     } catch {
  //       this.dialogService.error('Une erreur est survenue lors de la sauvegarde de la note.')
  //     }
  //   }
  // }

  // private buildGroups(): void {
  //   const groupedExercises: ExerciseGroup[] = []
  //   const groupedExerciseIds: Set<string> = new Set()
  //   const activityExercisesMap = new Map<string, ExerciseGroup[]>()
  //   if (!this.correction) {
  //     console.error('No correction')
  //     return
  //   }

  //   console.error('this.correction.ActivityCorrections', this.correction.ActivityCorrections)
  //   for (const activity of this.correction.ActivityCorrections) {
  //     for (const exercise of activity.exercises) {
  //       if (!groupedExerciseIds.has(exercise.exerciseId)) {
  //         groupedExerciseIds.add(exercise.exerciseId)
  //         const newGroup: ExerciseGroup = {
  //           exerciseId: exercise.exerciseId,
  //           exerciseName: exercise.exerciseName,
  //           users: [exercise],
  //           graded: exercise.correctedGrade != null,
  //         }
  //         groupedExercises.push(newGroup)
  //       } else {
  //         const group = groupedExercises.find((g) => g.exerciseId === exercise.exerciseId)
  //         if (group) {
  //           group.users.push(exercise)
  //           group.graded = exercise.correctedGrade != null && group.graded
  //         }
  //       }
  //       activityExercisesMap.set(activity.activityName, groupedExercises)
  //     }
  //   }
  //   console.error('groupedExercisesIds', groupedExerciseIds)
  //   this.exerciseGroups = activityExercisesMap
  //   console.error(this.exerciseGroups)
  // }

  protected trackByExerciseId(_: number, group: ExerciseGroup): string {
    return group.exerciseId
  }
}
