import { TestBed } from '@angular/core/testing'
import { AuthService } from '@platon/core/browser'
import { CourseMonitorPresenceProvider } from '../models/course-monitor-presence-provider'
import { CourseMonitorPresenceService } from './course-monitor-presence.service'

describe('CourseMonitorPresenceService', () => {
  let service: CourseMonitorPresenceService
  let authService: jest.Mocked<Pick<AuthService, 'ready'>>
  let provider: jest.Mocked<CourseMonitorPresenceProvider>
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    authService = { ready: jest.fn() }
    provider = {
      subscribeToMonitorPresence: jest.fn(),
      unsubscribeFromMonitorPresence: jest.fn(),
    }
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    TestBed.configureTestingModule({
      providers: [
        CourseMonitorPresenceService,
        { provide: AuthService, useValue: authService },
        { provide: CourseMonitorPresenceProvider, useValue: provider },
      ],
    })

    service = TestBed.inject(CourseMonitorPresenceService)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('subscribeToMonitorPresence()', () => {
    it("notifie le provider avec l'id de l'utilisateur courant et l'activité", async () => {
      authService.ready.mockResolvedValue({ id: 'user-1' } as any)

      await service.subscribeToMonitorPresence('activity-1')

      expect(provider.subscribeToMonitorPresence).toHaveBeenCalledWith({ userId: 'user-1', activityId: 'activity-1' })
    })

    it("ne notifie pas le provider si aucun utilisateur n'est connecté", async () => {
      authService.ready.mockResolvedValue(undefined)

      await service.subscribeToMonitorPresence('activity-1')

      expect(provider.subscribeToMonitorPresence).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('unsubscribeFromMonitorPresence()', () => {
    it("notifie le provider avec l'id de l'utilisateur courant et l'activité", async () => {
      authService.ready.mockResolvedValue({ id: 'user-1' } as any)

      await service.unsubscribeFromMonitorPresence('activity-1')

      expect(provider.unsubscribeFromMonitorPresence).toHaveBeenCalledWith({
        userId: 'user-1',
        activityId: 'activity-1',
      })
    })

    it("ne notifie pas le provider si aucun utilisateur n'est connecté", async () => {
      authService.ready.mockResolvedValue(undefined)

      await service.unsubscribeFromMonitorPresence('activity-1')

      expect(provider.unsubscribeFromMonitorPresence).not.toHaveBeenCalled()
    })
  })
})
