import { Test } from '@nestjs/testing'
import { NotFoundResponse } from '@platon/core/common'
import { ActivityEntity } from '../activity/activity.entity'
import { ActivityService } from '../activity/activity.service'
import { CourseGroupEntity } from '../course-group/course-group.entity'
import { CourseGroupService } from '../course-group/course-group.service'
import { ActivityGroupController } from './activity-group.controller'
import { ActivityGroupEntity } from './activity-group.entity'
import { ActivityGroupService } from './activity-group.service'

describe('ActivityGroupController', () => {
  let controller: ActivityGroupController
  let activityGroupService: jest.Mocked<Pick<ActivityGroupService, 'create' | 'delete' | 'search' | 'update'>>
  let activityService: jest.Mocked<Pick<ActivityService, 'withActivity'>>
  let courseGroupService: jest.Mocked<Pick<CourseGroupService, 'findById'>>

  const withActivityMock = (activity: Partial<ActivityEntity> | null) =>
    jest.fn(async (_id: string, consumer: (a: ActivityEntity | null) => void | Promise<void>) => {
      await consumer(activity as ActivityEntity)
    })

  beforeEach(async () => {
    activityGroupService = { create: jest.fn(), delete: jest.fn(), search: jest.fn(), update: jest.fn() }
    activityService = { withActivity: jest.fn() }
    courseGroupService = { findById: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        ActivityGroupController,
        { provide: ActivityGroupService, useValue: activityGroupService },
        { provide: ActivityService, useValue: activityService },
        { provide: CourseGroupService, useValue: courseGroupService },
      ],
    }).compile()

    controller = module.get(ActivityGroupController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it("devrait lever une NotFoundResponse si l'activité n'existe pas", async () => {
      activityService.withActivity.mockImplementation(withActivityMock(null))

      await expect(controller.create('activity-1', 'group-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait lever une NotFoundResponse si le groupe n'existe pas", async () => {
      activityService.withActivity.mockImplementation(withActivityMock({ id: 'activity-1' }))
      courseGroupService.findById.mockResolvedValue(null)

      await expect(controller.create('activity-1', 'group-1')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait créer l'association", async () => {
      activityService.withActivity.mockImplementation(withActivityMock({ id: 'activity-1' }))
      courseGroupService.findById.mockResolvedValue({ id: 'group-1' } as CourseGroupEntity)

      await controller.create('activity-1', 'group-1')

      expect(activityGroupService.create).toHaveBeenCalledWith('activity-1', 'group-1')
    })
  })

  describe('delete', () => {
    it("devrait supprimer l'association", async () => {
      await controller.delete('activity-1', 'group-1')

      expect(activityGroupService.delete).toHaveBeenCalledWith('activity-1', 'group-1')
    })
  })

  describe('search', () => {
    it('devrait retourner la liste des groupes associés', async () => {
      activityGroupService.search.mockResolvedValue([{ id: 'ag1' } as ActivityGroupEntity])

      const result = await controller.search('activity-1')

      expect(result.total).toBe(1)
    })
  })

  describe('update', () => {
    it('devrait déléguer au service', async () => {
      activityGroupService.update.mockResolvedValue([])

      await controller.update('activity-1', ['g1', 'g2'])

      expect(activityGroupService.update).toHaveBeenCalledWith('activity-1', ['g1', 'g2'])
    })
  })
})
