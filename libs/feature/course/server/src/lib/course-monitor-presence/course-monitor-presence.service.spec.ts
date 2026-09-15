import { Test } from '@nestjs/testing'
import { PubSubService } from '@platon/core/server'
import {
  MONITOR_PRESENCE_SUBSCRIBE,
  MONITOR_PRESENCE_UNSUBSCRIBE,
  MonitorPresencePayload,
} from '@platon/feature/course/common'
import { CourseMonitorPresenceService } from './course-monitor-presence.service'

describe('CourseMonitorPresenceService', () => {
  let service: CourseMonitorPresenceService
  let handlers: Record<string, (payload: MonitorPresencePayload) => void>
  let pubSubService: jest.Mocked<Pick<PubSubService, 'subscribe'>>

  beforeEach(async () => {
    handlers = {}
    pubSubService = {
      subscribe: jest.fn((channel: string, handler: (payload: MonitorPresencePayload) => void) => {
        handlers[channel] = handler
        return Promise.resolve(1)
      }) as never,
    }

    const module = await Test.createTestingModule({
      providers: [CourseMonitorPresenceService, { provide: PubSubService, useValue: pubSubService }],
    }).compile()

    service = module.get(CourseMonitorPresenceService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("devrait s'abonner aux canaux subscribe et unsubscribe à la construction", () => {
    expect(pubSubService.subscribe).toHaveBeenCalledWith(MONITOR_PRESENCE_SUBSCRIBE, expect.any(Function))
    expect(pubSubService.subscribe).toHaveBeenCalledWith(MONITOR_PRESENCE_UNSUBSCRIBE, expect.any(Function))
  })

  it('devrait retourner un tableau vide sans monitor actif', () => {
    expect(service.getActiveMonitoringUsers('activity-1')).toEqual([])
  })

  it('devrait ajouter un utilisateur comme monitor actif via le canal subscribe', () => {
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-1', userId: 'user-1' })

    expect(service.getActiveMonitoringUsers('activity-1')).toEqual(['user-1'])
  })

  it('devrait accumuler plusieurs utilisateurs sur la même activité', () => {
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-1', userId: 'user-1' })
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-1', userId: 'user-2' })

    expect(service.getActiveMonitoringUsers('activity-1').sort()).toEqual(['user-1', 'user-2'])
  })

  it('devrait retirer un utilisateur via le canal unsubscribe sans affecter les autres', () => {
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-1', userId: 'user-1' })
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-1', userId: 'user-2' })

    handlers[MONITOR_PRESENCE_UNSUBSCRIBE]({ activityId: 'activity-1', userId: 'user-1' })

    expect(service.getActiveMonitoringUsers('activity-1')).toEqual(['user-2'])
  })

  it('devrait nettoyer une activité quand plus aucun monitor ne reste', () => {
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-1', userId: 'user-1' })

    handlers[MONITOR_PRESENCE_UNSUBSCRIBE]({ activityId: 'activity-1', userId: 'user-1' })

    expect(service.getActiveMonitoringUsers('activity-1')).toEqual([])
  })

  it('ne devrait pas planter en retirant un utilisateur sur une activité inconnue', () => {
    expect(() => handlers[MONITOR_PRESENCE_UNSUBSCRIBE]({ activityId: 'unknown', userId: 'user-1' })).not.toThrow()
  })

  it('devrait isoler les monitors par activité', () => {
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-1', userId: 'user-1' })
    handlers[MONITOR_PRESENCE_SUBSCRIBE]({ activityId: 'activity-2', userId: 'user-2' })

    expect(service.getActiveMonitoringUsers('activity-1')).toEqual(['user-1'])
    expect(service.getActiveMonitoringUsers('activity-2')).toEqual(['user-2'])
  })
})
