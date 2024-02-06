/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { HttpErrorResponse } from '@angular/common/http'
import { Injectable, OnDestroy } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AuthService, DialogService } from '@platon/core/browser'
import { ListResponse, User } from '@platon/core/common'
import { CourseService } from '@platon/feature/course/browser'
import {
  Activity,
  Course,
  CourseMember,
  CourseMemberFilters,
  CreateCourseMember,
  UpdateCourse,
} from '@platon/feature/course/common'
import { ResultService } from '@platon/feature/result/browser'
import { ActivityResults } from '@platon/feature/result/common'
import { LayoutState } from '@platon/shared/ui'
import { BehaviorSubject, Subscription, firstValueFrom } from 'rxjs'

@Injectable()
export class ActivityPresenter implements OnDestroy {
  private readonly subscriptions: Subscription[] = []
  private readonly context = new BehaviorSubject<Context>(this.defaultContext())

  readonly contextChange = this.context.asObservable()
  readonly onDeletedActivity = this.courseService.onDeletedActivity

  constructor(
    private readonly authService: AuthService,
    private readonly dialogService: DialogService,
    private readonly resultService: ResultService,
    private readonly courseService: CourseService,
    private readonly activatedRoute: ActivatedRoute
  ) {
    this.subscriptions.push(
      this.activatedRoute.paramMap.subscribe((params) => {
        this.onChangeRoute(params.get('courseId') as string, params.get('activityId') as string).catch(console.error)
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  defaultContext(): Context {
    return { state: 'LOADING' }
  }

  // Members

  async addMember(input: CreateCourseMember): Promise<void> {
    const { course } = this.context.value as Required<Context>
    try {
      await firstValueFrom(this.courseService.createMember(course, input))
    } catch {
      this.alertError()
    }
  }

  async deleteMember(member: CourseMember): Promise<void> {
    try {
      await firstValueFrom(this.courseService.deleteMember(member))
    } catch {
      this.alertError()
    }
  }

  async searchMembers(filters: CourseMemberFilters = {}): Promise<ListResponse<CourseMember>> {
    const { course } = this.context.value as Required<Context>
    return firstValueFrom(this.courseService.searchMembers(course, filters))
  }

  async update(input: UpdateCourse): Promise<boolean> {
    const { course } = this.context.value as Required<Context>
    try {
      const changes = await firstValueFrom(this.courseService.update(course.id, input))
      this.context.next({
        ...this.context.value,
        course: changes,
      })

      this.dialogService.success('Les informations du cours ont bien été modifiées !')
      return true
    } catch {
      this.alertError()
      return false
    }
  }

  private async refresh(courseId: string, activityId: string): Promise<void> {
    const [user, course, activity, results] = await Promise.all([
      this.authService.ready(),
      firstValueFrom(
        this.courseService.find({
          id: courseId,
          expands: ['permissions'],
        })
      ),
      firstValueFrom(this.courseService.findActivity(courseId, activityId)),
      firstValueFrom(this.resultService.activityResults(activityId)),
    ])

    this.context.next({
      state: 'READY',
      user,
      course,
      activity,
      results,
    })
  }

  private async onChangeRoute(courseId: string, activityId: string): Promise<void> {
    try {
      await this.refresh(courseId, activityId)
    } catch (error) {
      const status = (error as HttpErrorResponse).status || 500
      if (status >= 400 && status < 500) {
        this.context.next({ state: 'NOT_FOUND' })
      } else {
        this.context.next({ state: 'SERVER_ERROR' })
      }
    }
  }

  private alertError(): void {
    this.dialogService.error('Une erreur est survenue lors de cette action, veuillez réessayer un peu plus tard !')
  }
}

export interface Context {
  state: LayoutState
  user?: User
  course?: Course
  activity?: Activity
  results?: ActivityResults
}
