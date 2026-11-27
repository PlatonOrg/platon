import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserOrderings, UserRoles, ForbiddenResponse, NotFoundResponse, User } from '@platon/core/common'
import { UserEntity, UserGroupService, UserService } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { Optional } from 'typescript-optional'
import { SelectQueryBuilder } from 'typeorm'
import { CourseNotificationService } from '../course-notification/course-notification.service'
import { CourseMemberEntity } from './course-member.entity'
import { CourseMemberService } from './course-member.service'
import { CourseMemberView } from './course-member.view'

describe('CourseMemberService', () => {
  let service: CourseMemberService
  let repository: MockRepository<CourseMemberEntity>
  let view: MockRepository<CourseMemberView>
  let notificationService: jest.Mocked<Pick<CourseNotificationService, 'notifyCourseMemberBeingCreated'>>
  let userGroupService: jest.Mocked<Pick<UserGroupService, 'listMembers'>>
  let userService: jest.Mocked<Pick<UserService, 'findById'>>

  beforeEach(async () => {
    repository = mockRepository<CourseMemberEntity>()
    view = mockRepository<CourseMemberView>()
    notificationService = { notifyCourseMemberBeingCreated: jest.fn().mockResolvedValue(undefined) }
    userGroupService = { listMembers: jest.fn() }
    userService = { findById: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        CourseMemberService,
        { provide: CourseNotificationService, useValue: notificationService },
        { provide: UserGroupService, useValue: userGroupService },
        { provide: UserService, useValue: userService },
        { provide: getRepositoryToken(CourseMemberView), useValue: view },
        { provide: getRepositoryToken(CourseMemberEntity), useValue: repository },
      ],
    }).compile()

    service = module.get(CourseMemberService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getByUserIdAndCourseId', () => {
    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.getByUserIdAndCourseId('user-1', 'course-1')

      expect(result.isEmpty()).toBe(true)
    })
  })

  describe('findById', () => {
    let qb: jest.Mocked<SelectQueryBuilder<CourseMemberEntity>>

    beforeEach(() => {
      qb = mockSelectQueryBuilder<CourseMemberEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)
    })

    it('devrait masquer le user si non résolu (membre de groupe sans user direct)', async () => {
      qb.getOne.mockResolvedValue({ id: 'member-1', user: {} } as never)

      const result = await service.findById('course-1', 'member-1')

      expect(result.get().user).toBeUndefined()
    })

    it('devrait conserver le user si résolu', async () => {
      const user = { id: 'user-1' } as UserEntity
      qb.getOne.mockResolvedValue({ id: 'member-1', user } as never)

      const result = await service.findById('course-1', 'member-1')

      expect(result.get().user).toBe(user)
    })
  })

  describe('findByIds', () => {
    it('devrait retourner un tableau vide sans requête si ids est vide', async () => {
      const result = await service.findByIds('course-1', [])

      expect(result).toEqual([])
      expect(repository.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('devrait masquer le user des membres sans user résolu', async () => {
      const qb = mockSelectQueryBuilder<CourseMemberEntity>()
      qb.getMany.mockResolvedValue([
        { id: 'm1', user: {} },
        { id: 'm2', user: { id: 'u2' } },
      ] as never)
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findByIds('course-1', ['m1', 'm2'])

      expect(result[0].user).toBeUndefined()
      expect(result[1].user).toEqual({ id: 'u2' })
    })
  })

  describe('search', () => {
    let qb: jest.Mocked<SelectQueryBuilder<CourseMemberEntity>>

    beforeEach(() => {
      qb = mockSelectQueryBuilder<CourseMemberEntity>()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      repository.createQueryBuilder.mockReturnValue(qb)
    })

    it('devrait trier par nom (last/first/username/group) quand order=NAME (par défaut)', async () => {
      await service.search('course-1')

      expect(qb.orderBy).toHaveBeenCalledWith('user.last_name', 'ASC')
      expect(qb.addOrderBy).toHaveBeenCalledWith('user.first_name', 'ASC')
      expect(qb.addOrderBy).toHaveBeenCalledWith('user.username', 'ASC')
      expect(qb.addOrderBy).toHaveBeenCalledWith('group.name', 'ASC')
    })

    it('devrait trier par un champ simple quand order != NAME', async () => {
      await service.search('course-1', { order: UserOrderings.CREATED_AT })

      expect(qb.orderBy).toHaveBeenCalledWith('member.created_at', 'DESC')
      expect(qb.addOrderBy).not.toHaveBeenCalled()
    })

    it('devrait filtrer par rôles avec la clause spéciale student (inclut les groupes)', async () => {
      await service.search('course-1', { roles: [CourseMemberRoles.student] })

      expect(qb.andWhere).toHaveBeenCalledWith('(group.id IS NOT NULL OR member.role IN (:...roles))', {
        roles: [CourseMemberRoles.student],
      })
    })

    it('devrait filtrer par rôles sans la clause groupe pour teacher', async () => {
      await service.search('course-1', { roles: [CourseMemberRoles.teacher] })

      expect(qb.andWhere).toHaveBeenCalledWith('member.role IN (:...roles)', { roles: [CourseMemberRoles.teacher] })
    })

    it('devrait filtrer par recherche textuelle', async () => {
      await service.search('course-1', { search: '  alice  ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { search: '%alice%' })
    })

    it('devrait masquer le user non résolu dans les résultats', async () => {
      qb.getManyAndCount.mockResolvedValue([[{ id: 'm1', user: {} }], 1] as never)

      const [members] = await service.search('course-1')

      expect(members[0].user).toBeUndefined()
    })

    it('devrait appliquer offset et limit', async () => {
      await service.search('course-1', { offset: 5, limit: 10 })

      expect(qb.offset).toHaveBeenCalledWith(5)
      expect(qb.limit).toHaveBeenCalledWith(10)
    })
  })

  describe('addUser', () => {
    it("devrait lever une ForbiddenResponse si l'utilisateur n'a pas le rôle enseignant pour un rôle teacher", async () => {
      userService.findById.mockResolvedValue(Optional.of({ id: 'u1', role: UserRoles.student } as UserEntity))

      await expect(service.addUser('course-1', 'u1', CourseMemberRoles.teacher)).rejects.toBeInstanceOf(
        ForbiddenResponse
      )
    })

    it("devrait lever une NotFoundResponse si l'utilisateur n'existe pas pour un rôle teacher", async () => {
      userService.findById.mockResolvedValue(Optional.empty())

      await expect(service.addUser('course-1', 'u1', CourseMemberRoles.teacher)).rejects.toBeInstanceOf(
        NotFoundResponse
      )
    })

    it('devrait créer le membre et notifier par défaut', async () => {
      const member = { id: 'member-1' } as CourseMemberEntity
      repository.create.mockReturnValue(member)
      repository.save.mockResolvedValue(member)
      view.find.mockResolvedValue([])

      const result = await service.addUser('course-1', 'u1', CourseMemberRoles.student)

      expect(repository.save).toHaveBeenCalledWith(member)
      expect(notificationService.notifyCourseMemberBeingCreated).toHaveBeenCalled()
      expect(result).toBe(member)
    })

    it('ne devrait pas notifier si notify=false', async () => {
      repository.create.mockReturnValue({} as CourseMemberEntity)
      repository.save.mockResolvedValue({ id: 'member-1' } as CourseMemberEntity)

      await service.addUser('course-1', 'u1', CourseMemberRoles.student, false)

      expect(notificationService.notifyCourseMemberBeingCreated).not.toHaveBeenCalled()
    })
  })

  describe('addGroup', () => {
    it("devrait lever une ForbiddenResponse si un membre du groupe n'est pas enseignant pour un rôle teacher", async () => {
      userGroupService.listMembers.mockResolvedValue([{ role: UserRoles.student } as UserEntity])

      await expect(service.addGroup('course-1', 'group-1', { role: CourseMemberRoles.teacher })).rejects.toBeInstanceOf(
        ForbiddenResponse
      )
    })

    it('devrait créer le membre groupe étudiant sans vérification de rôle', async () => {
      const member = { id: 'member-1' } as CourseMemberEntity
      repository.create.mockReturnValue(member)
      repository.save.mockResolvedValue(member)
      view.find.mockResolvedValue([])

      const result = await service.addGroup('course-1', 'group-1')

      expect(userGroupService.listMembers).not.toHaveBeenCalled()
      expect(result).toBe(member)
    })
  })

  describe('delete', () => {
    it('devrait supprimer le membre', async () => {
      await service.delete('course-1', 'member-1')

      expect(repository.delete).toHaveBeenCalledWith({ courseId: 'course-1', id: 'member-1' })
    })
  })

  describe('updateRole', () => {
    it("devrait lever une NotFoundResponse si le membre n'existe pas", async () => {
      view.findOne.mockResolvedValue(null)

      await expect(service.updateRole('course-1', 'member-1', CourseMemberRoles.teacher)).rejects.toBeInstanceOf(
        NotFoundResponse
      )
    })

    it("devrait lever une ForbiddenResponse si l'utilisateur cible n'a pas de rôle enseignant", async () => {
      view.findOne.mockResolvedValue({ userRole: UserRoles.student } as CourseMemberView)

      await expect(service.updateRole('course-1', 'member-1', CourseMemberRoles.teacher)).rejects.toBeInstanceOf(
        ForbiddenResponse
      )
    })

    it('devrait mettre à jour le rôle', async () => {
      view.findOne.mockResolvedValue({ userRole: UserRoles.teacher } as CourseMemberView)

      await service.updateRole('course-1', 'member-1', CourseMemberRoles.teacher)

      expect(repository.update).toHaveBeenCalledWith(
        { courseId: 'course-1', id: 'member-1' },
        { role: CourseMemberRoles.teacher }
      )
    })
  })

  describe('setArchivedByUser', () => {
    it("devrait lever une NotFoundResponse si l'utilisateur n'est pas membre direct", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.setArchivedByUser('course-1', 'user-1', true)).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait archiver le membre', async () => {
      repository.findOne.mockResolvedValue({ id: 'member-1' } as CourseMemberEntity)

      await service.setArchivedByUser('course-1', 'user-1', true)

      expect(repository.update).toHaveBeenCalledWith({ id: 'member-1', courseId: 'course-1' }, { archived: true })
    })
  })

  describe('isMember', () => {
    it('devrait retourner true si un résultat est trouvé', async () => {
      view.findOne.mockResolvedValue({} as CourseMemberView)

      await expect(service.isMember('course-1', 'user-1')).resolves.toBe(true)
    })

    it('devrait retourner false si aucun résultat', async () => {
      view.findOne.mockResolvedValue(null)

      await expect(service.isMember('course-1', 'user-1')).resolves.toBe(false)
    })
  })

  describe('hasWritePermission', () => {
    it('devrait retourner true pour un admin sans requête', async () => {
      const result = await service.hasWritePermission('course-1', { role: UserRoles.admin } as User)

      expect(result).toBe(true)
      expect(view.findOne).not.toHaveBeenCalled()
    })

    it('devrait retourner true si un enregistrement teacher existe', async () => {
      view.findOne.mockResolvedValue({} as CourseMemberView)

      const result = await service.hasWritePermission('course-1', { id: 'u1', role: UserRoles.teacher } as User)

      expect(result).toBe(true)
    })

    it("devrait retourner false si aucun enregistrement teacher n'existe", async () => {
      view.findOne.mockResolvedValue(null)

      const result = await service.hasWritePermission('course-1', { id: 'u1', role: UserRoles.student } as User)

      expect(result).toBe(false)
    })
  })

  describe('getCoursesByMemberId', () => {
    it('devrait retourner un tableau vide sans membres', async () => {
      view.find.mockResolvedValue([])

      await expect(service.getCoursesByMemberId('member-1')).resolves.toEqual([])
    })

    it('devrait retourner les ids de cours des membres trouvés', async () => {
      view.find.mockResolvedValue([{ courseId: 'c1' }, { courseId: 'c2' }] as CourseMemberView[])

      await expect(service.getCoursesByMemberId('member-1')).resolves.toEqual(['c1', 'c2'])
    })
  })
})
