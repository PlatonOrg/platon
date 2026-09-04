import { Test, TestingModule } from '@nestjs/testing'
import { PubSubService } from '@platon/core/server'
import {
  MONITOR_PRESENCE_SUBSCRIBE,
  MONITOR_PRESENCE_UNSUBSCRIBE,
  MonitorPresencePayload,
} from '@platon/feature/course/common'
import { CourseMonitorPresenceService } from './course-monitor-presence.service'

describe('CourseMonitorPresenceService', () => {
  let service: CourseMonitorPresenceService
  let pubSubService: jest.Mocked<Pick<PubSubService, 'subscribe'>>
  let subscribeHandler: (payload: MonitorPresencePayload) => void
  let unsubscribeHandler: (payload: MonitorPresencePayload) => void

  beforeEach(async () => {
    pubSubService = { subscribe: jest.fn() }
    pubSubService.subscribe.mockImplementation(((
      channel: string,
      onMessage: (payload: MonitorPresencePayload) => void
    ) => {
      if (channel === MONITOR_PRESENCE_SUBSCRIBE) subscribeHandler = onMessage
      if (channel === MONITOR_PRESENCE_UNSUBSCRIBE) unsubscribeHandler = onMessage
      return Promise.resolve(1)
    }) as PubSubService['subscribe'])

    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseMonitorPresenceService, { provide: PubSubService, useValue: pubSubService }],
    }).compile()

    service = module.get(CourseMonitorPresenceService)
  })

  it("s'abonne aux canaux subscribe et unsubscribe à la construction", () => {
    expect(pubSubService.subscribe).toHaveBeenCalledWith(MONITOR_PRESENCE_SUBSCRIBE, expect.any(Function))
    expect(pubSubService.subscribe).toHaveBeenCalledWith(MONITOR_PRESENCE_UNSUBSCRIBE, expect.any(Function))
  })

  it('retourne un tableau vide pour une activité sans observateur', () => {
    expect(service.getActiveMonitoringUsers('activity-1')).toEqual([])
  })

  it('ajoute un utilisateur comme observateur actif', () => {
    subscribeHandler({ activityId: 'activity-1', userId: 'user-1' })
    expect(service.getActiveMonitoringUsers('activity-1')).toEqual(['user-1'])
  })

  it('ne duplique pas un même utilisateur observant deux fois la même activité', () => {
    subscribeHandler({ activityId: 'activity-1', userId: 'user-1' })
    subscribeHandler({ activityId: 'activity-1', userId: 'user-1' })
    expect(service.getActiveMonitoringUsers('activity-1')).toEqual(['user-1'])
  })

  it('garde les observateurs de plusieurs activités isolés les uns des autres', () => {
    subscribeHandler({ activityId: 'activity-1', userId: 'user-1' })
    subscribeHandler({ activityId: 'activity-2', userId: 'user-2' })
    expect(service.getActiveMonitoringUsers('activity-1')).toEqual(['user-1'])
    expect(service.getActiveMonitoringUsers('activity-2')).toEqual(['user-2'])
  })

  it("retire un utilisateur quand il arrête d'observer", () => {
    subscribeHandler({ activityId: 'activity-1', userId: 'user-1' })
    subscribeHandler({ activityId: 'activity-1', userId: 'user-2' })

    unsubscribeHandler({ activityId: 'activity-1', userId: 'user-1' })

    expect(service.getActiveMonitoringUsers('activity-1')).toEqual(['user-2'])
  })

  it("nettoie l'entrée de l'activité quand le dernier observateur se désabonne", () => {
    subscribeHandler({ activityId: 'activity-1', userId: 'user-1' })

    unsubscribeHandler({ activityId: 'activity-1', userId: 'user-1' })

    expect(service.getActiveMonitoringUsers('activity-1')).toEqual([])
  })

  it("un désabonnement sans abonnement préalable ne lève pas d'erreur", () => {
    expect(() => unsubscribeHandler({ activityId: 'activite-inconnue', userId: 'user-1' })).not.toThrow()
  })
})
