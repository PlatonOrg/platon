import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { DataSource } from 'typeorm'
import { CourseNotificationService } from '../course-notification/course-notification.service'
import { ActivityMemberEntity } from './activity-member.entity'
import { ActivityMemberService } from './activity-member.service'
import { ActivityMemberView } from './activity-member.view'

describe('ActivityMemberService', () => {
  let service: ActivityMemberService
  let repository: MockRepository<ActivityMemberEntity>
  let view: MockRepository<ActivityMemberView>
  let dataSource: { transaction: jest.Mock }
  let notificationService: jest.Mocked<Pick<CourseNotificationService, 'notifyActivityMemberBeingCreated'>>

  beforeEach(async () => {
    repository = mockRepository<ActivityMemberEntity>()
    view = mockRepository<ActivityMemberView>()
    dataSource = { transaction: jest.fn() }
    notificationService = { notifyActivityMemberBeingCreated: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        ActivityMemberService,
        { provide: DataSource, useValue: dataSource },
        { provide: CourseNotificationService, useValue: notificationService },
        { provide: getRepositoryToken(ActivityMemberView), useValue: view },
        { provide: getRepositoryToken(ActivityMemberEntity), useValue: repository },
      ],
    }).compile()

    service = module.get(ActivityMemberService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('devrait masquer le user non résolu', async () => {
      const qb = mockSelectQueryBuilder<ActivityMemberEntity>()
      qb.getOne.mockResolvedValue({ id: 'm1', user: {} } as never)
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findById('activity-1', 'm1')

      expect(result.get().user).toBeUndefined()
    })
  })

  describe('search', () => {
    it('devrait masquer le user non résolu dans les résultats', async () => {
      const qb = mockSelectQueryBuilder<ActivityMemberEntity>()
      qb.getManyAndCount.mockResolvedValue([[{ id: 'm1', user: {} }], 1] as never)
      repository.createQueryBuilder.mockReturnValue(qb)

      const [items] = await service.search('activity-1')

      expect(items[0].user).toBeUndefined()
    })
  })

  describe('create', () => {
    it('devrait créer le membre et notifier', async () => {
      const member = { id: 'm1' } as ActivityMemberEntity
      repository.create.mockReturnValue(member)
      repository.save.mockResolvedValue(member)
      view.find.mockResolvedValue([])

      const result = await service.create({ activityId: 'activity-1' })

      expect(notificationService.notifyActivityMemberBeingCreated).toHaveBeenCalled()
      expect(result).toBe(member)
    })
  })

  describe('update', () => {
    it('devrait remplacer les membres et notifier les nouveaux', async () => {
      view.find.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'new-1' }] as ActivityMemberView[])

      const manager = {
        delete: jest.fn(),
        create: jest.fn((_entity, data) => data),
        save: jest.fn((data) => Promise.resolve(data)),
      }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.update('activity-1', [{ userId: 'u1' }])

      expect(manager.delete).toHaveBeenCalledWith(ActivityMemberEntity, { activityId: 'activity-1' })
      expect(notificationService.notifyActivityMemberBeingCreated).toHaveBeenCalledWith([{ id: 'new-1' }])
    })

    it('ne devrait pas notifier si aucun nouveau membre', async () => {
      const same = [{ id: 'same-1' }] as ActivityMemberView[]
      view.find.mockResolvedValueOnce(same).mockResolvedValueOnce(same)

      const manager = { delete: jest.fn(), create: jest.fn(), save: jest.fn().mockResolvedValue([]) }
      dataSource.transaction.mockImplementation((fn) => fn(manager))

      await service.update('activity-1', [])

      expect(notificationService.notifyActivityMemberBeingCreated).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('devrait supprimer le membre', async () => {
      await service.delete('activity-1', 'm1')

      expect(repository.delete).toHaveBeenCalledWith({ activityId: 'activity-1', id: 'm1' })
    })
  })

  describe('isMember', () => {
    it('devrait retourner true si trouvé', async () => {
      view.findOne.mockResolvedValue({} as ActivityMemberView)

      await expect(service.isMember('activity-1', 'u1')).resolves.toBe(true)
    })

    it('devrait retourner false sinon', async () => {
      view.findOne.mockResolvedValue(null)

      await expect(service.isMember('activity-1', 'u1')).resolves.toBe(false)
    })
  })

  describe('isPrivateMember', () => {
    it('devrait retourner false si aucun résultat', async () => {
      view.findOne.mockResolvedValue(null)

      await expect(service.isPrivateMember('activity-1', 'u1')).resolves.toBe(false)
    })

    it('devrait retourner true si memberId est renseigné (membre direct)', async () => {
      view.findOne.mockResolvedValue({ memberId: 'member-1' } as ActivityMemberView)

      await expect(service.isPrivateMember('activity-1', 'u1')).resolves.toBe(true)
    })

    it('devrait retourner false si memberId est absent (membre via groupe)', async () => {
      view.findOne.mockResolvedValue({ memberId: null } as unknown as ActivityMemberView)

      await expect(service.isPrivateMember('activity-1', 'u1')).resolves.toBe(false)
    })
  })
})
