import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse, UserRoles } from '@platon/core/common'
import { UserEntity, UserService } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { SelectQueryBuilder } from 'typeorm'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsEntity } from './entities/lms.entity'
import { LTI_LAUNCH_INTERCEPTOR, LTILaunchInterceptor } from './interceptor/lti-interceptor'
import { LTIPayload } from './provider/payload'
import { AdminRoles, InstructorRoles, StudentRoles } from './provider/roles'
import { LTIService } from './lti.service'

describe('LTIService', () => {
  let service: LTIService
  let lmsRepo: MockRepository<LmsEntity>
  let lmsUserRepo: MockRepository<LmsUserEntity>
  let userService: jest.Mocked<Pick<UserService, 'findByUsername' | 'findById' | 'create' | 'update'>>
  let discovery: jest.Mocked<Pick<DiscoveryService, 'providersWithMetaAtKey'>>

  const buildPayload = (overrides: Partial<LTIPayload> = {}): LTIPayload =>
    ({
      user_id: 'lms-user-1',
      roles: [],
      ...overrides,
    } as LTIPayload)

  beforeEach(async () => {
    lmsRepo = mockRepository<LmsEntity>()
    lmsUserRepo = mockRepository<LmsUserEntity>()
    userService = {
      findByUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    discovery = { providersWithMetaAtKey: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        LTIService,
        { provide: getRepositoryToken(LmsEntity), useValue: lmsRepo },
        { provide: getRepositoryToken(LmsUserEntity), useValue: lmsUserRepo },
        { provide: UserService, useValue: userService },
        { provide: DiscoveryService, useValue: discovery },
      ],
    }).compile()

    service = module.get(LTIService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('onModuleInit / interceptLaunch', () => {
    it('devrait enregistrer les intercepteurs découverts puis les exécuter lors du lancement', async () => {
      const interceptor: LTILaunchInterceptor = { intercept: jest.fn().mockResolvedValue(undefined) }
      discovery.providersWithMetaAtKey.mockResolvedValue([{ discoveredClass: { instance: interceptor } } as never])

      await service.onModuleInit()

      expect(discovery.providersWithMetaAtKey).toHaveBeenCalledWith(LTI_LAUNCH_INTERCEPTOR)

      const args = { lms: {} as LmsEntity, lmsUser: {} as LmsUserEntity, payload: buildPayload(), nextUrl: '/' }
      await service.interceptLaunch(args)

      expect(interceptor.intercept).toHaveBeenCalledWith(args)
    })
  })

  describe('findLmsById', () => {
    it('devrait retourner un Optional vide si le LMS est introuvable', async () => {
      lmsRepo.findOne.mockResolvedValue(null)

      const result = await service.findLmsById('id-1')

      expect(lmsRepo.findOne).toHaveBeenCalledWith({ where: { id: 'id-1' } })
      expect(result.isEmpty()).toBe(true)
    })

    it('devrait retourner le LMS trouvé', async () => {
      const lms = { id: 'id-1' } as LmsEntity
      lmsRepo.findOne.mockResolvedValue(lms)

      const result = await service.findLmsById('id-1')

      expect(result.get()).toBe(lms)
    })
  })

  describe('findLmsByConsumerKey', () => {
    it('devrait chercher le LMS par consumerKey', async () => {
      lmsRepo.findOne.mockResolvedValue(null)

      await service.findLmsByConsumerKey('key-1')

      expect(lmsRepo.findOne).toHaveBeenCalledWith({ where: { consumerKey: 'key-1' } })
    })
  })

  describe('searchLMS', () => {
    let qb: jest.Mocked<SelectQueryBuilder<LmsEntity>>

    beforeEach(() => {
      qb = mockSelectQueryBuilder<LmsEntity>()
      lmsRepo.createQueryBuilder.mockReturnValue(qb)
      qb.getManyAndCount.mockResolvedValue([[], 0])
    })

    it('devrait trier par nom ascendant par défaut', async () => {
      await service.searchLMS()

      expect(qb.orderBy).toHaveBeenCalledWith('name', 'ASC')
      expect(qb.andWhere).not.toHaveBeenCalled()
    })

    it('devrait filtrer par recherche textuelle sur le nom', async () => {
      await service.searchLMS({ search: '  moodle  ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { search: '%moodle%' })
    })

    it('ne devrait pas filtrer si la recherche est vide après trim', async () => {
      await service.searchLMS({ search: '   ' })

      expect(qb.andWhere).not.toHaveBeenCalled()
    })

    it('devrait trier selon le champ demandé avec la direction par défaut associée', async () => {
      await service.searchLMS({ order: 'CREATED_AT' as never })

      expect(qb.orderBy).toHaveBeenCalledWith('created_at', 'DESC')
    })

    it('devrait utiliser la direction explicite si fournie', async () => {
      await service.searchLMS({ order: 'CREATED_AT' as never, direction: 'ASC' as never })

      expect(qb.orderBy).toHaveBeenCalledWith('created_at', 'ASC')
    })

    it('devrait appliquer offset et limit quand fournis', async () => {
      await service.searchLMS({ offset: 5, limit: 20 })

      expect(qb.offset).toHaveBeenCalledWith(5)
      expect(qb.limit).toHaveBeenCalledWith(20)
    })
  })

  describe('createLms', () => {
    it('devrait sauvegarder le nouveau LMS', async () => {
      const lms = { name: 'Moodle' } as Partial<LmsEntity>
      lmsRepo.save.mockResolvedValue(lms as LmsEntity)

      const result = await service.createLms(lms)

      expect(lmsRepo.save).toHaveBeenCalledWith(lms)
      expect(result).toBe(lms)
    })
  })

  describe('updateLms', () => {
    it("devrait lever une NotFoundResponse si le LMS n'existe pas", async () => {
      lmsRepo.findOne.mockResolvedValue(null)

      await expect(service.updateLms('missing', { name: 'x' })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait fusionner les changements et sauvegarder', async () => {
      const lms = { id: 'id-1', name: 'Old' } as LmsEntity
      lmsRepo.findOne.mockResolvedValue(lms)
      lmsRepo.save.mockImplementation(async (entity) => entity as LmsEntity)

      const result = await service.updateLms('id-1', { name: 'New' })

      expect(lmsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1', name: 'New' }))
      expect(result.name).toBe('New')
    })
  })

  describe('deleteLms', () => {
    it('devrait supprimer le LMS par id', async () => {
      await service.deleteLms('id-1')

      expect(lmsRepo.delete).toHaveBeenCalledWith('id-1')
    })
  })

  describe('findLmsUserByUsername', () => {
    it('devrait chercher parmi les LMS fournis', async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)
      const lmses = [{ id: 'lms-1' }, { id: 'lms-2' }] as LmsEntity[]

      await service.findLmsUserByUsername('john', lmses)

      expect(lmsUserRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'john', lmsId: expect.anything() },
      })
    })
  })

  describe('withLmsUser', () => {
    const lms = { id: 'lms-1', name: 'Moodle' } as LmsEntity

    it("devrait retourner l'utilisateur LMS existant sans upgrade si son rôle est déjà enseignant", async () => {
      const existingUser = { id: 'user-1', role: UserRoles.teacher, username: 'john' } as UserEntity
      const existing = { id: 'lmsuser-1', user: existingUser } as LmsUserEntity
      lmsUserRepo.findOne.mockResolvedValue(existing)

      const payload = buildPayload({ roles: [InstructorRoles.Instructor] })
      const result = await service.withLmsUser(lms, payload)

      expect(result).toBe(existing)
      expect(userService.update).not.toHaveBeenCalled()
    })

    it("devrait upgrader le rôle de l'utilisateur existant vers enseignant si le payload contient un rôle admin/instructeur", async () => {
      const existingUser = { id: 'user-1', role: UserRoles.student, username: 'john' } as UserEntity
      const existing = { id: 'lmsuser-1', user: existingUser } as LmsUserEntity
      lmsUserRepo.findOne.mockResolvedValue(existing)
      userService.update.mockResolvedValue(existingUser)

      const payload = buildPayload({ roles: [AdminRoles.Administrator] })
      const result = await service.withLmsUser(lms, payload)

      expect(userService.update).toHaveBeenCalledWith('user-1', { role: UserRoles.teacher })
      expect(existingUser.role).toBe(UserRoles.teacher)
      expect(result).toBe(existing)
    })

    it('ne devrait pas rétrograder un enseignant existant même si le payload ne contient que des rôles étudiants', async () => {
      const existingUser = { id: 'user-1', role: UserRoles.teacher, username: 'john' } as UserEntity
      const existing = { id: 'lmsuser-1', user: existingUser } as LmsUserEntity
      lmsUserRepo.findOne.mockResolvedValue(existing)

      const payload = buildPayload({ roles: [StudentRoles.Student] })
      await service.withLmsUser(lms, payload)

      expect(userService.update).not.toHaveBeenCalled()
    })

    it('devrait créer un nouvel utilisateur avec le username issu de ext_user_username', async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)
      userService.findByUsername.mockResolvedValue(Optional.empty())
      const createdUser = { id: 'new-user', username: 'moodle_john' } as UserEntity
      userService.create.mockResolvedValue(createdUser)
      const createdLmsUser = { id: 'new-lmsuser' } as LmsUserEntity
      lmsUserRepo.create.mockReturnValue(createdLmsUser)
      lmsUserRepo.save.mockResolvedValue(createdLmsUser)

      const payload = buildPayload({ roles: [StudentRoles.Student], ext_user_username: 'moodle_john' })
      const result = await service.withLmsUser(lms, payload)

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'moodle_john', role: UserRoles.student })
      )
      expect(lmsUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'new-user', lmsId: 'lms-1', username: 'moodle_john' })
      )
      expect(result).toBe(createdLmsUser)
    })

    it('devrait retomber sur custom_lis_user_username puis ext_d2l_username', async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)
      userService.findByUsername.mockResolvedValue(Optional.empty())
      userService.create.mockResolvedValue({ id: 'u', username: 'blackboard_john' } as UserEntity)
      lmsUserRepo.create.mockReturnValue({} as LmsUserEntity)
      lmsUserRepo.save.mockResolvedValue({} as LmsUserEntity)

      const payload = buildPayload({ roles: [], custom_lis_user_username: 'blackboard_john' })
      await service.withLmsUser(lms, payload)

      expect(userService.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'blackboard_john' }))
    })

    it("devrait générer un username depuis prénom/nom si aucun champ username LTI n'est fourni", async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)
      userService.findByUsername.mockResolvedValue(Optional.empty())
      userService.create.mockResolvedValue({ id: 'u', username: 'j_doe' } as UserEntity)
      lmsUserRepo.create.mockReturnValue({} as LmsUserEntity)
      lmsUserRepo.save.mockResolvedValue({} as LmsUserEntity)

      const payload = buildPayload({
        roles: [],
        lis_person_name_given: 'John',
        lis_person_name_family: 'Doe',
      })
      await service.withLmsUser(lms, payload)

      expect(userService.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'j_doe' }))
    })

    it("devrait utiliser 'user' comme nom par défaut si rien n'est disponible", async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)
      userService.findByUsername.mockResolvedValue(Optional.empty())
      userService.create.mockResolvedValue({ id: 'u', username: 'user' } as UserEntity)
      lmsUserRepo.create.mockReturnValue({} as LmsUserEntity)
      lmsUserRepo.save.mockResolvedValue({} as LmsUserEntity)

      const payload = buildPayload({ roles: [] })
      await service.withLmsUser(lms, payload)

      expect(userService.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'user' }))
    })

    it("devrait suffixer le username avec un compteur tant qu'il est déjà pris", async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)
      userService.findByUsername
        .mockResolvedValueOnce(Optional.of({} as UserEntity)) // 'john' pris
        .mockResolvedValueOnce(Optional.of({} as UserEntity)) // 'john1' pris
        .mockResolvedValueOnce(Optional.empty()) // 'john2' libre
      userService.create.mockResolvedValue({ id: 'u', username: 'john2' } as UserEntity)
      lmsUserRepo.create.mockReturnValue({} as LmsUserEntity)
      lmsUserRepo.save.mockResolvedValue({} as LmsUserEntity)

      const payload = buildPayload({ roles: [], ext_user_username: 'john' })
      await service.withLmsUser(lms, payload)

      expect(userService.findByUsername).toHaveBeenCalledTimes(3)
      expect(userService.findByUsername).toHaveBeenNthCalledWith(1, 'john')
      expect(userService.findByUsername).toHaveBeenNthCalledWith(2, 'john1')
      expect(userService.findByUsername).toHaveBeenNthCalledWith(3, 'john2')
      expect(userService.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'john2' }))
    })

    it('devrait déterminer le rôle student par défaut sans rôle LTI reconnu', async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)
      userService.findByUsername.mockResolvedValue(Optional.empty())
      userService.create.mockResolvedValue({ id: 'u' } as UserEntity)
      lmsUserRepo.create.mockReturnValue({} as LmsUserEntity)
      lmsUserRepo.save.mockResolvedValue({} as LmsUserEntity)

      const payload = buildPayload({ roles: ['urn:lti:instrole:ims/lis/Unknown' as never] })
      await service.withLmsUser(lms, payload)

      expect(userService.create).toHaveBeenCalledWith(expect.objectContaining({ role: UserRoles.student }))
    })
  })
})
