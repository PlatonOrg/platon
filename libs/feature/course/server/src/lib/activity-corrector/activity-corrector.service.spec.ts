import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { DataSource, SelectQueryBuilder } from 'typeorm'
import { CourseNotificationService } from '../course-notification/course-notification.service'
import { ActivityCorrectorEntity } from './activity-corrector.entity'
import { ActivityCorrectorService } from './activity-corrector.service'
import { ActivityCorrectorView } from './activity-corrector.view'

describe('ActivityCorrectorService', () => {
  let service: ActivityCorrectorService
  let repository: MockRepository<ActivityCorrectorEntity>
  let view: MockRepository<ActivityCorrectorView>
  let dataSource: { transaction: jest.Mock }
  let notificationService: jest.Mocked<
    Pick<CourseNotificationService, 'notifyCorrectorsBeingCreated' | 'notifyCorrectorsBeingRemoved'>
  >

  beforeEach(async () => {
    repository = mockRepository<ActivityCorrectorEntity>()
    view = mockRepository<ActivityCorrectorView>()
    dataSource = { transaction: jest.fn() }
    notificationService = {
      notifyCorrectorsBeingCreated: jest.fn().mockResolvedValue(undefined),
      notifyCorrectorsBeingRemoved: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [
        ActivityCorrectorService,
        { provide: DataSource, useValue: dataSource },
        { provide: CourseNotificationService, useValue: notificationService },
        { provide: getRepositoryToken(ActivityCorrectorView), useValue: view },
        { provide: getRepositoryToken(ActivityCorrectorEntity), useValue: repository },
      ],
    }).compile()

    service = module.get(ActivityCorrectorService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('devrait masquer le user non résolu', async () => {
      const qb = mockSelectQueryBuilder<ActivityCorrectorEntity>()
      qb.getOne.mockResolvedValue({ id: 'c1', user: {} } as never)
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findById('activity-1', 'c1')

      expect(result.get().user).toBeUndefined()
    })
  })

  describe('search', () => {
    it('devrait masquer le user non résolu dans les résultats', async () => {
      const qb = mockSelectQueryBuilder<ActivityCorrectorEntity>()
      qb.getManyAndCount.mockResolvedValue([[{ id: 'c1', user: {} }], 1] as never)
      repository.createQueryBuilder.mockReturnValue(qb)

      const [items] = await service.search('activity-1')

      expect(items[0].user).toBeUndefined()
    })
  })

  describe('create', () => {
    it('devrait créer le correcteur et notifier', async () => {
      const corrector = { id: 'c1' } as ActivityCorrectorEntity
      repository.create.mockReturnValue(corrector)
      repository.save.mockResolvedValue(corrector)
      view.find.mockResolvedValue([])

      const result = await service.create({ activityId: 'activity-1' })

      expect(repository.save).toHaveBeenCalledWith(corrector)
      expect(notificationService.notifyCorrectorsBeingCreated).toHaveBeenCalled()
      expect(result).toBe(corrector)
    })
  })

  describe('update', () => {
    it('devrait remplacer les correcteurs et notifier les ajouts/suppressions', async () => {
      view.find
        .mockResolvedValueOnce([{ id: 'old-1' }] as ActivityCorrectorView[]) // oldViews
        .mockResolvedValueOnce([{ id: 'new-1' }] as ActivityCorrectorView[]) // newViews

      const manager = {
        delete: jest.fn(),
        create: jest.fn((_entity, data) => data),
        save: jest.fn((data) => Promise.resolve(data)),
      }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.update('activity-1', [{ userId: 'u1' }])

      expect(manager.delete).toHaveBeenCalledWith(ActivityCorrectorEntity, { activityId: 'activity-1' })
      expect(notificationService.notifyCorrectorsBeingCreated).toHaveBeenCalledWith([{ id: 'new-1' }])
      expect(notificationService.notifyCorrectorsBeingRemoved).toHaveBeenCalledWith([{ id: 'old-1' }])
    })

    it('ne devrait pas notifier si les vues restent identiques', async () => {
      const same = [{ id: 'same-1' }] as ActivityCorrectorView[]
      view.find.mockResolvedValueOnce(same).mockResolvedValueOnce(same)

      const manager = { delete: jest.fn(), create: jest.fn(), save: jest.fn().mockResolvedValue([]) }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.update('activity-1', [])

      expect(notificationService.notifyCorrectorsBeingCreated).not.toHaveBeenCalled()
      expect(notificationService.notifyCorrectorsBeingRemoved).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('devrait notifier la suppression si une ligne a été affectée', async () => {
      view.find.mockResolvedValue([{ id: 'c1' }] as ActivityCorrectorView[])
      repository.delete.mockResolvedValue({ affected: 1 } as never)

      await service.delete('activity-1', 'c1')

      expect(notificationService.notifyCorrectorsBeingRemoved).toHaveBeenCalledWith([{ id: 'c1' }])
    })

    it("ne devrait pas notifier si aucune ligne n'a été affectée", async () => {
      view.find.mockResolvedValue([])
      repository.delete.mockResolvedValue({ affected: 0 } as never)

      await service.delete('activity-1', 'c1')

      expect(notificationService.notifyCorrectorsBeingRemoved).not.toHaveBeenCalled()
    })
  })

  describe('isCorrector', () => {
    it('devrait retourner true si trouvé', async () => {
      view.findOne.mockResolvedValue({} as ActivityCorrectorView)

      await expect(service.isCorrector('activity-1', 'user-1')).resolves.toBe(true)
    })

    it('devrait retourner false sinon', async () => {
      view.findOne.mockResolvedValue(null)

      await expect(service.isCorrector('activity-1', 'user-1')).resolves.toBe(false)
    })
  })
})
