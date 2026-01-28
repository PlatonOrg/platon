import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { RouterModule } from '@angular/router'
import { firstValueFrom, Subscription } from 'rxjs'

import { CoursePresenter } from '../../../courses/course/course.presenter'
import { Activity, CourseMember, CourseMemberRoles, CourseSection } from '@platon/feature/course/common'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import {
  CourseActivityCardComponent,
  CourseMemberTableComponent,
  CoursePipesModule,
  CourseService,
} from '@platon/feature/course/browser'
import { DialogModule, DialogService, UserSearchModalComponent } from '@platon/core/browser'
import { User, UserGroup } from '@platon/core/common'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { ResultService } from '@platon/feature/result/browser'
import { ActivityResults, AnswerStates } from '@platon/feature/result/common'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import {
  TestsMailEditorComponent,
  TestsService,
  TestsSettingsComponent,
  TestsTermsEditorComponent,
} from '@platon/feature/tests/browser'
import { MatDialog } from '@angular/material/dialog'
import { UiModalDrawerComponent } from '@platon/shared/ui'

@Component({
  standalone: true,
  selector: 'app-test-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    CourseMemberTableComponent,
    UserSearchModalComponent,
    NzSelectModule,
    CourseActivityCardComponent,
    NzIconModule,
    NzButtonModule,
    NzToolTipModule,
    CoursePipesModule,
    DialogModule,
    NzPopconfirmModule,
    TestsTermsEditorComponent,
    UiModalDrawerComponent,
    TestsSettingsComponent,
  ],
})
export class TestDashboardPage implements OnInit, OnDestroy {
  private readonly presenter = inject(CoursePresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly subscriptions: Subscription[] = []

  protected section?: CourseSection
  protected activity?: Activity
  protected results?: ActivityResults

  private computedStats = false

  protected teachers: CourseMember[] = []
  protected nonDeletables: string[] = []
  protected excludes: string[] = []

  protected nbParticipants = 0
  protected nbStarted = 0
  protected nbFinished = 0
  protected averageScore = 0

  protected context = this.presenter.defaultContext()

  constructor(
    private readonly courseService: CourseService,
    private readonly dialogService: DialogService,
    private readonly resultService: ResultService,
    private readonly testsService: TestsService,
    private readonly dialog: MatDialog
  ) {}

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        const activities = await this.presenter.listActivities()
        if (activities.length >= 0) {
          this.activity = activities[0]
          this.results = await firstValueFrom(this.resultService.activityResults(this.activity.id))
          if (!this.computedStats) {
            await this.computeStats()
          }
        } else {
          this.computedStats = false
        }
        this.changeDetectorRef.markForCheck()
      })
    )

    let sections = await this.presenter.listSections()
    if (sections.length == 0) {
      await this.presenter.addSection({
        name: 'Section',
        order: 0,
      })
      sections = await this.presenter.listSections()
    }
    this.section = sections[0]

    if (this.context.course?.ownerId) {
      this.nonDeletables.push(this.context.course?.ownerId)
    }

    await this.refreshMembers()

    this.changeDetectorRef.markForCheck()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected get canEdit(): boolean {
    const { course } = this.context
    if (!course) return false
    return !!course.permissions?.update
  }

  private async refreshMembers(): Promise<void> {
    this.teachers = await this.presenter.searchMembers({
      roles: [CourseMemberRoles.teacher],
    })
    this.excludes = []
    this.teachers.forEach((member) => {
      if (member.user) {
        this.excludes.push(member.user.id)
      }
    })
    this.changeDetectorRef.markForCheck()
  }

  protected async addTeachers(userOrGroups: (User | UserGroup)[]) {
    await Promise.all(
      userOrGroups.map(async (userOrGroup) => {
        return this.presenter.addMember({
          id: userOrGroup.id,
          isGroup: false,
          role: CourseMemberRoles.teacher,
        })
      })
    )
    await this.refreshMembers()
  }

  protected async removeMember(member: CourseMember) {
    await this.presenter.deleteMember(member)
    await this.refreshMembers()
  }

  protected async deleteActivity() {
    if (!this.activity) return
    this.changeDetectorRef.markForCheck()
    try {
      await firstValueFrom(this.courseService.deleteActivity(this.activity))
      this.activity = undefined
      this.dialogService.success('Activité supprimée !')
    } catch {
      this.dialogService.error(
        "Une erreur est survenue lors de la suppression de l'activité, veuillez réessayer un peu plus tard !"
      )
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  openTermsEditor() {
    this.dialog.open(TestsTermsEditorComponent, {
      data: {
        courseId: this.context.course?.id,
      },
      width: '80%',
      height: '80%',
    })
  }

  openMailEditor() {
    this.dialog.open(TestsMailEditorComponent, {
      data: {
        courseId: this.context.course?.id,
      },
      width: '80%',
      height: '80%',
    })
  }

  async sendAllMails() {
    await firstValueFrom(this.testsService.sendAllMails(this.context.course?.id || ''))
  }

  async computeStats() {
    const candidates = await this.presenter.searchMembers({
      roles: [CourseMemberRoles.student],
    })
    this.nbParticipants = candidates.length
    this.averageScore = this.results?.averageScore || 0

    for (const candidate of this.results?.users || []) {
      const exercises = Object.values(candidate.exercises || {})
      let hasStartedAtLeastOne = false
      let allExercisesFinished = true

      for (const exercise of exercises) {
        if (exercise.state !== AnswerStates.NOT_STARTED) {
          hasStartedAtLeastOne = true
        }
        if (
          exercise.state !== AnswerStates.ANSWERED &&
          exercise.state !== AnswerStates.FAILED &&
          exercise.state !== AnswerStates.SUCCEEDED &&
          exercise.state !== AnswerStates.PART_SUCC
        ) {
          allExercisesFinished = false
        }
      }
      if (hasStartedAtLeastOne) {
        this.nbStarted++
      }
      if (exercises.length > 0 && allExercisesFinished) {
        this.nbFinished++
        this.nbStarted--
      }
    }

    this.computedStats = true
  }
}
