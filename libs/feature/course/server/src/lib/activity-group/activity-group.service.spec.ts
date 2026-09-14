import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { CourseGroupService } from '../course-group/course-group.service'
import { ActivityGroupEntity } from './activity-group.entity'
import { ActivityGroupService } from './activity-group.service'

describe('ActivityGroupService', () => {
  let service: ActivityGroupService
  let repository: MockRepository<ActivityGroupEntity>
  let courseGroupService: jest.Mocked<Pick<CourseGroupService, 'isMember'>>

  beforeEach(async () => {
    repository = mockRepository<ActivityGroupEntity>()
    courseGroupService = { isMember: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        ActivityGroupService,
        { provide: CourseGroupService, useValue: courseGroupService },
        { provide: getRepositoryToken(ActivityGroupEntity), useValue: repository },
      ],
    }).compile()

    service = module.get(ActivityGroupService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create / delete / search / numberOfGroups', () => {
    it('devrait créer une association activité/groupe', async () => {
      const created = { activityId: 'a1', groupId: 'g1' } as ActivityGroupEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      await expect(service.create('a1', 'g1')).resolves.toBe(created)
    })

    it('devrait supprimer une association', async () => {
      await service.delete('a1', 'g1')

      expect(repository.delete).toHaveBeenCalledWith({ activityId: 'a1', groupId: 'g1' })
    })

    it('devrait rechercher les groupes associés', async () => {
      repository.find.mockResolvedValue([])

      await service.search('a1')

      expect(repository.find).toHaveBeenCalledWith({ where: { activityId: 'a1' } })
    })

    it('devrait compter les groupes associés', async () => {
      repository.count.mockResolvedValue(3)

      await expect(service.numberOfGroups('a1')).resolves.toBe(3)
    })
  })

  describe('update', () => {
    it('devrait remplacer les groupes associés', async () => {
      repository.create.mockImplementation((data) => data as ActivityGroupEntity)
      repository.save.mockImplementation(async (data) => data as ActivityGroupEntity)

      const result = await service.update('a1', ['g1', 'g2'])

      expect(repository.delete).toHaveBeenCalledWith({ activityId: 'a1' })
      expect(result).toHaveLength(2)
    })
  })

  describe('isUserInActivityGroup', () => {
    it("devrait retourner true si l'utilisateur est membre d'un des groupes associés", async () => {
      repository.find.mockResolvedValue([{ groupId: 'g1' }, { groupId: 'g2' }] as ActivityGroupEntity[])
      courseGroupService.isMember.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

      await expect(service.isUserInActivityGroup('a1', 'u1')).resolves.toBe(true)
    })

    it("devrait retourner false si l'utilisateur n'est membre d'aucun groupe associé", async () => {
      repository.find.mockResolvedValue([{ groupId: 'g1' }] as ActivityGroupEntity[])
      courseGroupService.isMember.mockResolvedValue(false)

      await expect(service.isUserInActivityGroup('a1', 'u1')).resolves.toBe(false)
    })

    it("devrait retourner false sans aucun groupe associé", async () => {
      repository.find.mockResolvedValue([])

      await expect(service.isUserInActivityGroup('a1', 'u1')).resolves.toBe(false)
    })
  })
})
