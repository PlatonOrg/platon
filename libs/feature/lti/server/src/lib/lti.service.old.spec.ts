import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse, UserRoles } from '@platon/core/common'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { In, SelectQueryBuilder } from 'typeorm'
import { Optional } from 'typescript-optional'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsEntity } from './entities/lms.entity'
import { LTI_LAUNCH_INTERCEPTOR, LTILaunchInterceptor } from './interceptor/lti-interceptor'
import { LTIPayload } from './provider/payload'
import { Lti11AdminRoles } from './provider/roles.lti11'
import { LTIOldService } from './lti.service.old'
import { LmsUserService } from './lms-user.service'

describe('LTIOldService', () => {
  let service: LTIOldService
  let lmsRepo: MockRepository<LmsEntity>
  let lmsUserRepo: MockRepository<LmsUserEntity>
  let lmsUserService: { findOrCreate: jest.MockedFunction<LmsUserService['findOrCreate']> }
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
    lmsUserService = { findOrCreate: jest.fn() }
    discovery = { providersWithMetaAtKey: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        LTIOldService,
        { provide: getRepositoryToken(LmsEntity), useValue: lmsRepo },
        { provide: getRepositoryToken(LmsUserEntity), useValue: lmsUserRepo },
        { provide: LmsUserService, useValue: lmsUserService },
        { provide: DiscoveryService, useValue: discovery },
      ],
    }).compile()

    service = module.get(LTIOldService)
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
      lmsRepo.delete.mockResolvedValue({ affected: 1, raw: [] })

      await service.deleteLms('id-1')

      expect(lmsRepo.delete).toHaveBeenCalledWith('id-1')
    })

    it("devrait lever une NotFoundResponse si le LMS n'existe pas", async () => {
      lmsRepo.delete.mockResolvedValue({ affected: 0, raw: [] })

      await expect(service.deleteLms('unknown')).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  describe('findLmsUserByUsername', () => {
    it('devrait chercher parmi les plateformes fournies', async () => {
      lmsUserRepo.findOne.mockResolvedValue(null)

      await service.findLmsUserByUsername('john', ['lms-1', 'lms-2'])

      expect(lmsUserRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'john', ltiPlatformId: In(['lms-1', 'lms-2']) },
      })
    })

    it('ne devrait pas interroger la base sans plateforme', async () => {
      await expect(service.findLmsUserByUsername('john', [])).resolves.toEqual(Optional.empty())
      expect(lmsUserRepo.findOne).not.toHaveBeenCalled()
    })
  })

  describe('withLmsUser', () => {
    const lms = { id: 'lms-1', name: 'Moodle' } as LmsEntity

    /** Runs withLmsUser and returns the role and the account LmsUserService would create on a first launch. */
    const launch = async (payload: LTIPayload) => {
      await service.withLmsUser(lms, payload)
      const [key, role, describeNewUser] = lmsUserService.findOrCreate.mock.calls[0]
      return { key, role, newUser: await describeNewUser() }
    }

    it("devrait déléguer à LmsUserService avec la plateforme et l'id LMS", async () => {
      const lmsUser = { id: 'lmsuser-1' } as LmsUserEntity
      lmsUserService.findOrCreate.mockResolvedValue(lmsUser)

      await expect(service.withLmsUser(lms, buildPayload({ user_id: 42 as never }))).resolves.toBe(lmsUser)
      expect(lmsUserService.findOrCreate).toHaveBeenCalledWith(
        { ltiPlatformId: 'lms-1', lmsUserId: '42' },
        UserRoles.student,
        expect.any(Function)
      )
    })

    it('devrait demander le rôle enseignant pour un rôle admin/instructeur', async () => {
      expect((await launch(buildPayload({ roles: [Lti11AdminRoles.Administrator] }))).role).toBe(UserRoles.teacher)
    })

    it('devrait déterminer le rôle student sans rôle LTI reconnu', async () => {
      const { role } = await launch(buildPayload({ roles: ['urn:lti:instrole:ims/lis/Unknown' as never] }))
      expect(role).toBe(UserRoles.student)
    })

    it('devrait utiliser ext_user_username comme username et le garder sur le LmsUser', async () => {
      const { newUser } = await launch(
        buildPayload({
          ext_user_username: 'moodle_john',
          lis_person_name_given: 'John',
          lis_person_name_family: 'Doe',
          lis_person_contact_email_primary: 'john@doe.fr',
        })
      )

      expect(newUser).toEqual({
        lmsUsername: 'moodle_john',
        baseUsername: 'moodle_john',
        user: { firstName: 'John', lastName: 'Doe', email: 'john@doe.fr' },
      })
    })

    it('devrait retomber sur custom_lis_user_username puis ext_d2l_username', async () => {
      const { newUser } = await launch(buildPayload({ custom_lis_user_username: 'blackboard_john' }))
      expect(newUser.baseUsername).toBe('blackboard_john')
    })

    it("devrait générer un username depuis prénom/nom si aucun champ username LTI n'est fourni", async () => {
      const { newUser } = await launch(buildPayload({ lis_person_name_given: 'John', lis_person_name_family: 'Doe' }))
      expect(newUser).toEqual(expect.objectContaining({ lmsUsername: undefined, baseUsername: 'j_doe' }))
    })

    it("devrait utiliser 'user' comme nom par défaut si rien n'est disponible", async () => {
      expect((await launch(buildPayload())).newUser.baseUsername).toBe('user')
    })
  })
})
