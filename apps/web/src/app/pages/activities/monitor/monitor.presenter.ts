import { Injectable, OnDestroy, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AuthService, DialogService } from '@platon/core/browser'
import { User } from '@platon/core/common'
import { CourseService } from '@platon/feature/course/browser'
import { Activity, Course, EXERCISE_CHANGES_NOTIFICATION } from '@platon/feature/course/common'
import { ResultService } from '@platon/feature/result/browser'
import { ActivityResults } from '@platon/feature/result/common'
import { PlayerExercise } from '@platon/feature/player/common'
import { NotificationService } from '@platon/feature/notification/browser'
// import { Notification } from '@platon/feature/notification/common'
import { LayoutState, layoutStateFromError } from '@platon/shared/ui'
import { BehaviorSubject, Subject, Subscription, firstValueFrom } from 'rxjs'
import { PlayerService } from '@platon/feature/player/browser'

@Injectable()
export class MonitorPresenter implements OnDestroy {
  private readonly authService = inject(AuthService)
  private readonly dialogService = inject(DialogService)
  private readonly resultService = inject(ResultService)
  private readonly courseService = inject(CourseService)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly notificationService = inject(NotificationService)
  private readonly playerService = inject(PlayerService)

  private readonly subscriptions: Subscription[] = []
  private isTest = false
  private readonly context = new BehaviorSubject<Context>(this.defaultContext())
  private readonly exerciseChanges = new Subject<ExerciseChangeEvent>()
  private readonly processedNotifications = new Set<string>()

  readonly contextChange = this.context.asObservable()
  readonly onDeletedActivity = this.courseService.onDeletedActivity
  readonly onExerciseChanges = this.exerciseChanges.asObservable()

  constructor() {
    this.subscriptions.push(
      this.activatedRoute.paramMap.subscribe((params) => {
        this.onChangeRoute(params.get('courseId') as string, params.get('activityId') as string).catch(console.error)
      })
    )

    this.subscriptions.push(
      this.activatedRoute.queryParamMap.subscribe((queryParamMap) => {
        this.isTest = queryParamMap.get('test') === 'true'
        this.context.next({ ...this.context.value, isTest: this.isTest })
      })
    )

    // Subscribe to exercise changes notifications
    this.subscribeToExerciseChanges().catch((error) => {
      this.dialogService.error("Une erreur est survenue lors de la souscription aux changements d'exercice.", error)
    })
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
    this.processedNotifications.clear()
  }

  defaultContext(): Context {
    return { state: 'LOADING', isTest: this.isTest }
  }

  async refresh(courseId: string, activityId: string): Promise<void> {
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
      isTest: this.isTest,
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
      this.context.next({ state: layoutStateFromError(error), isTest: this.isTest })
    }
  }

  private async subscribeToExerciseChanges(): Promise<void> {
    // Subscribe to notifications - get 5 at a time for more efficient batch processing
    const subscription = this.notificationService.paginate(5).subscribe({
      next: async (pagination) => {
        // Process only when we have an active activity context
        const context = this.context.value as Required<Context>
        if (!context.activity) return

        // Process all relevant notifications and clean them up
        const exerciseChangeNotifications = pagination.notifications.filter((notification) => {
          const data = notification.data as Record<string, unknown>
          // Filter out notifications we've already processed
          return data['type'] === EXERCISE_CHANGES_NOTIFICATION && !this.processedNotifications.has(notification.id)
        })

        if (exerciseChangeNotifications.length === 0) return

        // Process each notification and delete them after processing
        for (const notification of exerciseChangeNotifications) {
          // Mark as processed immediately to avoid duplicates
          this.processedNotifications.add(notification.id)

          const notificationData = notification.data as Record<string, unknown>
          const changes = notificationData['changes'] as PlayerExercise
          const userId = notificationData['userId'] as string

          // Check if we have valid changes
          if (changes) {
            // Delete the notification so it doesn't accumulate in the UI
            firstValueFrom(this.notificationService.deleteNotification(notification.id)).catch((error) => {
              console.warn('Failed to delete notification:', error)
            })
            const oldUserResults = context.results?.users.find((user) => user.id === userId)
            if (oldUserResults) {
              const userResults = await firstValueFrom(
                this.resultService.sessionResults(oldUserResults.activitySessionId)
              )
              // Re-read the latest context here to avoid clobbering updates made concurrently during the await above.
              const latestContext = this.context.value as Required<Context>
              this.context.next({
                ...latestContext,
                results: {
                  ...latestContext.results,
                  users: latestContext.results.users.map((user) => (user.id === userId ? userResults : user)),
                },
              })
            } else {
              const results = await firstValueFrom(this.resultService.activityResults(context.activity.id))
              // Re-read the latest context here to avoid clobbering updates made concurrently during the await above.
              const latestContext = this.context.value as Required<Context>
              this.context.next({
                ...latestContext,
                results,
              })
            }
            this.exerciseChanges.next({
              userId: userId as string,
              userName: notificationData['userName'] as string | undefined,
              changes,
            })
          }
        }
      },
      error: (error) => {
        console.error('Error subscribing to exercise changes:', error)
      },
    })

    this.subscriptions.push(subscription)
  }

  async openActivityForUser(sessionId: string): Promise<void> {
    await firstValueFrom(this.playerService.openSession(sessionId))
  }

  async closeActivityForUser(sessionId: string): Promise<void> {
    await firstValueFrom(this.playerService.terminate(sessionId))
  }

  async regenerateActivityCode(): Promise<void> {
    const { activity } = this.context.value
    if (!activity) return
    await firstValueFrom(this.courseService.regenerateActivityCode(activity))
    await this.refresh(activity.courseId, activity.id)
  }
}

export interface Context {
  state: LayoutState
  isTest: boolean
  user?: User
  course?: Course
  activity?: Activity
  results?: ActivityResults
}

export interface ExerciseChangeEvent {
  userId: string
  userName?: string
  changes: PlayerExercise
}
