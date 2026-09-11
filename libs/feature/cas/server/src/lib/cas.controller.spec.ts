import { Test, TestingModule } from '@nestjs/testing'
import { AuthService, UserService } from '@platon/core/server'
import { NotFoundResponse } from '@platon/core/common'
import { LTIService } from '@platon/feature/lti/server'
import { Optional } from 'typescript-optional'
import { AxiosService } from './axios.service'
import { CasController } from './cas.controller'
import { CasEntity } from './entities/cas.entity'
import { CasService } from './cas.service'

describe('CasController', () => {
  let controller: CasController
  let service: jest.Mocked<CasService>
  let ltiService: jest.Mocked<LTIService>
  let authService: jest.Mocked<AuthService>
  let userService: jest.Mocked<UserService>
  let https: jest.Mocked<AxiosService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CasController],
      providers: [
        {
          provide: CasService,
          useValue: {
            searchCas: jest.fn(),
            findCasById: jest.fn(),
            findCasByName: jest.fn(),
            createCas: jest.fn(),
            updateCas: jest.fn(),
            deleteCas: jest.fn(),
            fromInput: jest.fn(),
          },
        },
        { provide: LTIService, useValue: { findLmsUserByUsername: jest.fn() } },
        { provide: AuthService, useValue: { authenticate: jest.fn() } },
        { provide: UserService, useValue: { findById: jest.fn() } },
        { provide: AxiosService, useValue: { get: jest.fn() } },
      ],
    }).compile()

    controller = module.get(CasController)
    service = module.get(CasService)
    ltiService = module.get(LTIService)
    authService = module.get(AuthService)
    userService = module.get(UserService)
    https = module.get(AxiosService)
  })

  describe('checkCasTicket', () => {
    it('devrait retourner le username en cas de succès', async () => {
      https.get.mockResolvedValue({
        data: { serviceResponse: { authenticationSuccess: { user: 'jdoe' } } },
      } as never)

      const result = await controller.checkCasTicket('https://cas.test/validate', 'ST-1', 'https://app.test')

      expect(result.get()).toBe('jdoe')
    })

    it("devrait lever une erreur avec la description en cas d'échec d'authentification CAS", async () => {
      https.get.mockResolvedValue({
        data: {
          serviceResponse: { authenticationFailure: { code: 'INVALID_TICKET', description: 'Ticket invalide' } },
        },
      } as never)

      await expect(controller.checkCasTicket('https://cas.test/validate', 'ST-1', 'https://app.test')).rejects.toThrow(
        'Ticket invalide'
      )
    })

    it('devrait retourner Optional.empty() si la réponse ne contient ni succès ni échec', async () => {
      https.get.mockResolvedValue({ data: { serviceResponse: {} } } as never)

      const result = await controller.checkCasTicket('https://cas.test/validate', 'ST-1', 'https://app.test')

      expect(result.isEmpty()).toBe(true)
    })

    it('devrait lever une erreur explicite quand le fournisseur CAS est injoignable (erreur réseau)', async () => {
      https.get.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(controller.checkCasTicket('https://cas.test/validate', 'ST-1', 'https://app.test')).rejects.toThrow(
        'Your CAS provider is not accessible'
      )
    })
  })

  describe('listCas', () => {
    it('devrait retourner uniquement les noms des CAS', async () => {
      service.searchCas.mockResolvedValue([[{ name: 'univ-a' } as CasEntity, { name: 'univ-b' } as CasEntity], 2])

      const result = await controller.listCas()

      expect(result.resources).toEqual(['univ-a', 'univ-b'])
      expect(result.total).toBe(2)
    })
  })

  describe('login', () => {
    const buildQuery = (overrides: Record<string, unknown> = {}) => ({ ticket: '', ...overrides } as never)
    const buildReq = () =>
      ({ get: jest.fn().mockReturnValue('app.test'), baseUrl: '', path: '/cas/login/my-cas' } as never)

    it("devrait rejeter avec NotFoundResponse si le CAS n'existe pas", async () => {
      service.findCasByName.mockResolvedValue(Optional.empty())

      await expect(controller.login('unknown-cas', buildQuery(), buildReq())).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait rediriger vers l'URL de connexion du CAS quand aucun ticket n'est fourni", async () => {
      service.findCasByName.mockResolvedValue(Optional.of({ loginURL: 'https://cas.test/login' } as CasEntity))

      const result = await controller.login('my-cas', buildQuery(), buildReq())

      expect(result.statusCode).toBe(302)
      expect(result.url).toContain('https://cas.test/login?service=')
    })

    it('devrait rediriger vers /login/no-account si le ticket CAS ne résout aucun utilisateur', async () => {
      service.findCasByName.mockResolvedValue(
        Optional.of({ serviceValidateURL: 'https://cas.test/validate', lmses: [] } as never)
      )
      jest.spyOn(controller, 'checkCasTicket').mockResolvedValue(Optional.empty())

      const result = await controller.login('my-cas', buildQuery({ ticket: 'ST-1' }), buildReq())

      expect(result).toEqual({ url: '/login/no-account', statusCode: 302 })
    })

    it('devrait rediriger vers /login/no-account si aucun utilisateur LMS ne correspond au username CAS', async () => {
      service.findCasByName.mockResolvedValue(
        Optional.of({ serviceValidateURL: 'https://cas.test/validate', lmses: [] } as never)
      )
      jest.spyOn(controller, 'checkCasTicket').mockResolvedValue(Optional.of('jdoe'))
      ltiService.findLmsUserByUsername.mockResolvedValue(Optional.empty())

      const result = await controller.login('my-cas', buildQuery({ ticket: 'ST-1' }), buildReq())

      expect(result).toEqual({ url: '/login/no-account', statusCode: 302 })
    })

    it("devrait rediriger vers /login/no-account si l'utilisateur platon associé est introuvable", async () => {
      service.findCasByName.mockResolvedValue(
        Optional.of({ serviceValidateURL: 'https://cas.test/validate', lmses: [] } as never)
      )
      jest.spyOn(controller, 'checkCasTicket').mockResolvedValue(Optional.of('jdoe'))
      ltiService.findLmsUserByUsername.mockResolvedValue(Optional.of({ userId: 'user-1' } as never))
      userService.findById.mockResolvedValue(Optional.empty())

      const result = await controller.login('my-cas', buildQuery({ ticket: 'ST-1' }), buildReq())

      expect(result).toEqual({ url: '/login/no-account', statusCode: 302 })
    })

    it("devrait authentifier l'utilisateur et rediriger avec les tokens quand tout est résolu", async () => {
      service.findCasByName.mockResolvedValue(
        Optional.of({ serviceValidateURL: 'https://cas.test/validate', lmses: [] } as never)
      )
      jest.spyOn(controller, 'checkCasTicket').mockResolvedValue(Optional.of('jdoe'))
      ltiService.findLmsUserByUsername.mockResolvedValue(Optional.of({ userId: 'user-1' } as never))
      userService.findById.mockResolvedValue(Optional.of({ username: 'jdoe' } as never))
      authService.authenticate.mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' })

      const result = await controller.login('my-cas', buildQuery({ ticket: 'ST-1', next: '/home' }), buildReq())

      expect(authService.authenticate).toHaveBeenCalledWith('user-1', 'jdoe')
      expect(result.statusCode).toBe(302)
      expect(result.url).toBe('/login?access-token=access-1&refresh-token=refresh-1&next=/home')
    })
  })

  describe('searchCas / findCas / createCas / updateCas / deleteCas', () => {
    it('searchCas devrait retourner les CAS mappés avec le total', async () => {
      service.searchCas.mockResolvedValue([[{ id: 'cas-1' } as CasEntity], 1])

      const result = await controller.searchCas({})

      expect(result.total).toBe(1)
    })

    it("findCas devrait rejeter avec NotFoundResponse si le CAS n'existe pas", async () => {
      service.findCasById.mockResolvedValue(Optional.empty())

      await expect(controller.findCas('unknown')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('findCas devrait retourner le CAS mappé', async () => {
      service.findCasById.mockResolvedValue(Optional.of({ id: 'cas-1' } as CasEntity))

      const result = await controller.findCas('cas-1')

      expect(result.resource).toBeDefined()
    })

    it('createCas devrait construire le CAS via fromInput puis le créer', async () => {
      service.fromInput.mockResolvedValue({ name: 'my-cas' } as never)
      service.createCas.mockResolvedValue({ id: 'cas-1', name: 'my-cas' } as CasEntity)

      const result = await controller.createCas({ name: 'my-cas' } as never)

      expect(result.resource.name).toBe('my-cas')
    })

    it('updateCas devrait construire les changements via fromInput puis mettre à jour', async () => {
      service.fromInput.mockResolvedValue({ name: 'Updated' } as never)
      service.updateCas.mockResolvedValue({ id: 'cas-1', name: 'Updated' } as CasEntity)

      const result = await controller.updateCas('cas-1', { name: 'Updated' } as never)

      expect(service.updateCas).toHaveBeenCalledWith('cas-1', { name: 'Updated' })
      expect(result.resource.name).toBe('Updated')
    })

    it('deleteCas devrait déléguer la suppression au service', async () => {
      await controller.deleteCas('cas-1')

      expect(service.deleteCas).toHaveBeenCalledWith('cas-1')
    })
  })
})
