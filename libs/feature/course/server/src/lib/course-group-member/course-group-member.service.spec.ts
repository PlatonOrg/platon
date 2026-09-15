import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { CourseGroupMemberEntity } from './course-group-member.entity'
import { CourseGroupMemberService } from './course-group-member.service'

describe('CourseGroupMemberService', () => {
  let service: CourseGroupMemberService
  let repository: MockRepository<CourseGroupMemberEntity>

  beforeEach(async () => {
    repository = mockRepository<CourseGroupMemberEntity>()

    const module = await Test.createTestingModule({
      providers: [
        CourseGroupMemberService,
        { provide: getRepositoryToken(CourseGroupMemberEntity), useValue: repository },
      ],
    }).compile()

    service = module.get(CourseGroupMemberService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('listCourseGroupMembers', () => {
    it('devrait lister les membres du groupe', async () => {
      repository.find.mockResolvedValue([])

      await service.listCourseGroupMembers('g1')

      expect(repository.find).toHaveBeenCalledWith({ where: { groupId: 'g1' } })
    })
  })

  describe('listGroupsMembers', () => {
    it('devrait concaténer les membres de plusieurs groupes', async () => {
      repository.find.mockResolvedValueOnce([{ userId: 'u1' }] as CourseGroupMemberEntity[])
      repository.find.mockResolvedValueOnce([{ userId: 'u2' }] as CourseGroupMemberEntity[])

      const result = await service.listGroupsMembers(['g1', 'g2'])

      expect(result).toHaveLength(2)
    })
  })

  describe('addCourseGroupMember', () => {
    it('devrait retourner le membre existant sans le recréer', async () => {
      const existing = { groupId: 'g1', userId: 'u1' } as CourseGroupMemberEntity
      repository.findOne.mockResolvedValue(existing)

      const result = await service.addCourseGroupMember('g1', 'u1')

      expect(result).toBe(existing)
      expect(repository.save).not.toHaveBeenCalled()
    })

    it("devrait créer le membre s'il n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)
      const created = { groupId: 'g1', userId: 'u1' } as CourseGroupMemberEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.addCourseGroupMember('g1', 'u1')

      expect(result).toBe(created)
    })
  })

  describe('deleteAllCourseGroups / deleteMember / deleteAllMembersFromGroup', () => {
    it('devrait supprimer tous les groupes', async () => {
      await service.deleteAllCourseGroups()

      expect(repository.delete).toHaveBeenCalledWith({})
    })

    it('devrait supprimer un membre précis', async () => {
      await service.deleteMember('g1', 'u1')

      expect(repository.delete).toHaveBeenCalledWith({ groupId: 'g1', userId: 'u1' })
    })

    it("devrait supprimer tous les membres d'un groupe", async () => {
      await service.deleteAllMembersFromGroup('g1')

      expect(repository.delete).toHaveBeenCalledWith({ groupId: 'g1' })
    })
  })

  describe('isMember', () => {
    it('devrait retourner true si trouvé', async () => {
      repository.findOne.mockResolvedValue({} as CourseGroupMemberEntity)

      await expect(service.isMember('g1', 'u1')).resolves.toBe(true)
    })

    it('devrait retourner false sinon', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.isMember('g1', 'u1')).resolves.toBe(false)
    })
  })
})
