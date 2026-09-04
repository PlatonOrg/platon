import { Injector, runInInjectionContext } from '@angular/core'
import { ActivatedRoute, ParamMap, convertToParamMap } from '@angular/router'
import { AuthService, DialogService } from '@platon/core/browser'
import { User } from '@platon/core/common'
import { CourseService } from '@platon/feature/course/browser'
import { Activity, Course, EXERCISE_CHANGES_NOTIFICATION } from '@platon/feature/course/common'
import { NotificationService } from '@platon/feature/notification/browser'
import { Notification } from '@platon/feature/notification/common'
import { PlayerService } from '@platon/feature/player/browser'
import { ActivityResults, UserResults } from '@platon/feature/result/common'
import { ResultService } from '@platon/feature/result/browser'
import { EMPTY, Subject, of } from 'rxjs'
import { Context, MonitorPresenter } from './monitor.presenter'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const user = { id: 'user-1' } as User
const course = { id: 'course-1' } as Course
const activity = { id: 'activity-1', courseId: 'course-1' } as Activity
const baseResults = { successRate: 0, averageScore: 0, users: [] as UserResults[] } as ActivityResults

const makeNotification = (overrides: Partial<Notification> = {}): Notification =>
  ({
    id: 'notif-1',
    userId: 'teacher-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {
      type: EXERCISE_CHANGES_NOTIFICATION,
      changes: { id: 'exercise-1' },
      userId: 'student-1',
      userName: 'Alice',
    },
    ...overrides,
  } as Notification)

interface Pagination {
  hasMore: boolean
  fetchMore: () => void
  unreadCount: number
  notifications: Notification[]
}

const makePagination = (notifications: Notification[]): Pagination => ({
  hasMore: false,
  fetchMore: () => undefined,
  unreadCount: notifications.length,
  notifications,
})

describe('MonitorPresenter', () => {
  let presenter: MonitorPresenter
  let authService: jest.Mocked<Pick<AuthService, 'ready'>>
  let dialogService: jest.Mocked<Pick<DialogService, 'error'>>
  let resultService: jest.Mocked<Pick<ResultService, 'activityResults' | 'sessionResults'>>
  let courseService: jest.Mocked<Pick<CourseService, 'find' | 'findActivity' | 'regenerateActivityCode'>>
  let notificationService: jest.Mocked<Pick<NotificationService, 'paginate' | 'deleteNotification'>>
  let playerService: jest.Mocked<Pick<PlayerService, 'openSession' | 'terminate'>>
  let paramMap$: Subject<ParamMap>
  let queryParamMap$: Subject<ParamMap>
  let notifications$: Subject<Pagination>
  let latestContext: Context | undefined

  beforeEach(() => {
    authService = { ready: jest.fn().mockResolvedValue(user) }
    dialogService = { error: jest.fn() }
    resultService = {
      activityResults: jest.fn().mockReturnValue(of(baseResults)),
      sessionResults: jest.fn(),
    }
    courseService = {
      find: jest.fn().mockReturnValue(of(course)),
      findActivity: jest.fn().mockReturnValue(of(activity)),
      regenerateActivityCode: jest.fn().mockReturnValue(of(activity)),
    }
    notifications$ = new Subject()
    notificationService = {
      paginate: jest.fn().mockReturnValue(notifications$.asObservable()),
      deleteNotification: jest.fn().mockReturnValue(of(true)),
    }
    playerService = {
      openSession: jest.fn().mockReturnValue(of({} as any)),
      terminate: jest.fn().mockReturnValue(of({} as any)),
    }

    paramMap$ = new Subject()
    queryParamMap$ = new Subject()
    const activatedRoute = {
      paramMap: paramMap$.asObservable(),
      queryParamMap: queryParamMap$.asObservable(),
    } as unknown as ActivatedRoute

    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DialogService, useValue: dialogService },
        { provide: ResultService, useValue: resultService },
        { provide: CourseService, useValue: { ...courseService, onDeletedActivity: EMPTY } },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: NotificationService, useValue: notificationService },
        { provide: PlayerService, useValue: playerService },
      ],
    })
    presenter = runInInjectionContext(injector, () => new MonitorPresenter())

    presenter.contextChange.subscribe((c) => (latestContext = c))
  })

  it('defaultContext() démarre en LOADING', () => {
    expect(presenter.defaultContext()).toEqual({ state: 'LOADING', isTest: false })
  })

  describe('refresh()', () => {
    it('charge user/course/activity/results et passe en READY', async () => {
      await presenter.refresh('course-1', 'activity-1')

      expect(latestContext).toEqual({
        state: 'READY',
        isTest: false,
        user,
        course,
        activity,
        results: baseResults,
      })
    })
  })

  describe('changement de route', () => {
    it('déclenche refresh() et passe en READY quand les paramètres de route changent', async () => {
      paramMap$.next(convertToParamMap({ courseId: 'course-1', activityId: 'activity-1' }))
      await flush()

      expect(latestContext?.state).toBe('READY')
      expect(latestContext?.activity).toEqual(activity)
    })

    it('passe en SERVER_ERROR si le chargement échoue', async () => {
      courseService.find.mockReturnValue(of(course))
      courseService.findActivity.mockImplementation(() => {
        throw new Error('boom')
      })

      paramMap$.next(convertToParamMap({ courseId: 'course-1', activityId: 'activity-1' }))
      await flush()

      expect(latestContext?.state).toBe('SERVER_ERROR')
    })
  })

  describe('openActivityForUser() / closeActivityForUser()', () => {
    it('ouvre la session du joueur pour un utilisateur', async () => {
      await presenter.openActivityForUser('session-1')
      expect(playerService.openSession).toHaveBeenCalledWith('session-1')
    })

    it('termine la session du joueur pour un utilisateur', async () => {
      await presenter.closeActivityForUser('session-1')
      expect(playerService.terminate).toHaveBeenCalledWith('session-1')
    })
  })

  describe('regenerateActivityCode()', () => {
    it('régénère le code puis rafraîchit le contexte', async () => {
      await presenter.refresh('course-1', 'activity-1')

      await presenter.regenerateActivityCode()

      expect(courseService.regenerateActivityCode).toHaveBeenCalledWith(activity)
      expect(courseService.findActivity).toHaveBeenCalledTimes(2)
    })

    it("ne fait rien si aucune activité n'est chargée dans le contexte", async () => {
      await presenter.regenerateActivityCode()
      expect(courseService.regenerateActivityCode).not.toHaveBeenCalled()
    })
  })

  describe('notifications de changement d’exercice', () => {
    it('ignore les notifications tant que le contexte n’a pas d’activité', async () => {
      notifications$.next(makePagination([makeNotification()]))
      await flush()

      expect(notificationService.deleteNotification).not.toHaveBeenCalled()
    })

    it('met à jour les résultats via sessionResults quand l’utilisateur est déjà dans les résultats', async () => {
      const existingResults = {
        ...baseResults,
        users: [{ id: 'student-1', activitySessionId: 'session-1' } as unknown as UserResults],
      } as ActivityResults
      resultService.activityResults.mockReturnValue(of(existingResults))
      await presenter.refresh('course-1', 'activity-1')

      const updatedUserResults = {
        id: 'student-1',
        activitySessionId: 'session-1',
        grade: 100,
      } as unknown as UserResults
      resultService.sessionResults.mockReturnValue(of(updatedUserResults))

      const events: unknown[] = []
      presenter.onExerciseChanges.subscribe((e) => events.push(e))

      notifications$.next(makePagination([makeNotification()]))
      await flush()

      expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-1')
      expect(resultService.sessionResults).toHaveBeenCalledWith('session-1')
      expect(latestContext?.results?.users[0]).toEqual(updatedUserResults)
      expect(events).toEqual([{ userId: 'student-1', userName: 'Alice', changes: { id: 'exercise-1' } }])
    })

    it("retombe sur activityResults quand l'utilisateur n'est pas déjà dans les résultats", async () => {
      await presenter.refresh('course-1', 'activity-1')
      resultService.activityResults.mockClear()

      const refreshedResults = { ...baseResults, successRate: 42 } as ActivityResults
      resultService.activityResults.mockReturnValue(of(refreshedResults))

      notifications$.next(makePagination([makeNotification()]))
      await flush()

      expect(resultService.sessionResults).not.toHaveBeenCalled()
      expect(resultService.activityResults).toHaveBeenCalledWith('activity-1')
      expect(latestContext?.results).toEqual(refreshedResults)
    })

    it('ne traite jamais deux fois la même notification (déduplication)', async () => {
      const existingResults = {
        ...baseResults,
        users: [{ id: 'student-1', activitySessionId: 'session-1' } as unknown as UserResults],
      } as ActivityResults
      resultService.activityResults.mockReturnValue(of(existingResults))
      await presenter.refresh('course-1', 'activity-1')
      resultService.sessionResults.mockReturnValue(
        of({ id: 'student-1', activitySessionId: 'session-1' } as unknown as UserResults)
      )

      notifications$.next(makePagination([makeNotification()]))
      await flush()
      notifications$.next(makePagination([makeNotification()]))
      await flush()

      expect(notificationService.deleteNotification).toHaveBeenCalledTimes(1)
      expect(resultService.sessionResults).toHaveBeenCalledTimes(1)
    })
  })
})
