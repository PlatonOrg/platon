import { Test } from '@nestjs/testing'
import { IRequest, PubSubService } from '@platon/core/server'
import { MONITOR_PRESENCE_SUBSCRIBE, MONITOR_PRESENCE_UNSUBSCRIBE } from '@platon/feature/course/common'
import { CoursePermissionsService } from '../permissions/permissions.service'
import { CourseMonitorPresenceController } from './course-monitor-presence.controller'

describe('CourseMonitorPresenceController', () => {
  let controller: CourseMonitorPresenceController
  let pubSubService: jest.Mocked<Pick<PubSubService, 'publish'>>
  let permissionService: jest.Mocked<Pick<CoursePermissionsService, 'ensureActivityWritePermission'>>
  const req = { user: { id: 'teacher-1' } } as IRequest

  beforeEach(async () => {
    pubSubService = { publish: jest.fn().mockResolvedValue(undefined) }
    permissionService = { ensureActivityWritePermission: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        CourseMonitorPresenceController,
        { provide: PubSubService, useValue: pubSubService },
        { provide: CoursePermissionsService, useValue: permissionService },
      ],
    }).compile()

    controller = module.get(CourseMonitorPresenceController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('devrait vérifier la permission puis publier sur le canal subscribe', async () => {
    const payload = { activityId: 'activity-1', userId: 'teacher-1' }

    const result = await controller.subscribeToMonitorPresence(payload, req)

    expect(permissionService.ensureActivityWritePermission).toHaveBeenCalledWith('activity-1', req)
    expect(pubSubService.publish).toHaveBeenCalledWith(MONITOR_PRESENCE_SUBSCRIBE, payload)
    expect(result).toEqual({ success: true })
  })

  it('devrait vérifier la permission puis publier sur le canal unsubscribe', async () => {
    const payload = { activityId: 'activity-1', userId: 'teacher-1' }

    const result = await controller.unsubscribeFromMonitorPresence(payload, req)

    expect(pubSubService.publish).toHaveBeenCalledWith(MONITOR_PRESENCE_UNSUBSCRIBE, payload)
    expect(result).toEqual({ success: true })
  })

  it('devrait propager une erreur de permission sans publier', async () => {
    permissionService.ensureActivityWritePermission.mockRejectedValue(new Error('forbidden'))

    await expect(
      controller.subscribeToMonitorPresence({ activityId: 'activity-1', userId: 'teacher-1' }, req)
    ).rejects.toThrow('forbidden')
    expect(pubSubService.publish).not.toHaveBeenCalled()
  })
})
