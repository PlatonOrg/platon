import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { CasOrdering, CasVersions } from '@platon/feature/cas/common'
import { LTIService } from '@platon/feature/lti/server'
import { Optional } from 'typescript-optional'
import { CasEntity } from './entities/cas.entity'
import { CasService } from './cas.service'

describe('CasService', () => {
  let service: CasService
  let repository: MockRepository<CasEntity>
  let ltiService: jest.Mocked<LTIService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasService,
        { provide: getRepositoryToken(CasEntity), useValue: mockRepository<CasEntity>() },
        { provide: LTIService, useValue: { findLmsById: jest.fn() } },
      ],
    }).compile()

    service = module.get(CasService)
    repository = module.get(getRepositoryToken(CasEntity))
    ltiService = module.get(LTIService)
  })

  describe('findCasById', () => {
    it('devrait retourner Optional.of(cas) si trouvé', async () => {
      const cas = { id: 'cas-1' } as CasEntity
      repository.findOne.mockResolvedValue(cas)

      const result = await service.findCasById('cas-1')

      expect(result.get()).toBe(cas)
    })

    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findCasById('unknown')

      expect(result.isPresent()).toBe(false)
    })
  })

  describe('findCasByName', () => {
    it('devrait chercher par nom avec les LMS associés', async () => {
      const qb = mockSelectQueryBuilder<CasEntity>()
      const cas = { id: 'cas-1', name: 'my-cas' } as CasEntity
      qb.getOne.mockResolvedValue(cas)
      repository.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findCasByName('my-cas')

      expect(qb.where).toHaveBeenCalledWith('cas.name = :name', { name: 'my-cas' })
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('cas.lmses', 'lmses')
      expect(result.get()).toBe(cas)
    })
  })

  describe('searchCas', () => {
    it('devrait trier par nom ASC par défaut', async () => {
      const qb = mockSelectQueryBuilder<CasEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.searchCas()

      expect(qb.orderBy).toHaveBeenCalledWith('cas.name', 'ASC')
    })

    it('devrait filtrer par texte de recherche', async () => {
      const qb = mockSelectQueryBuilder<CasEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.searchCas({ search: 'univ' })

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { search: '%univ%' })
    })

    it('devrait trier selon order/direction fournis', async () => {
      const qb = mockSelectQueryBuilder<CasEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.searchCas({ order: CasOrdering.CREATED_AT })

      expect(qb.orderBy).toHaveBeenCalledWith('created_at', 'DESC')
    })

    it('devrait appliquer offset et limit', async () => {
      const qb = mockSelectQueryBuilder<CasEntity>()
      repository.createQueryBuilder.mockReturnValue(qb)

      await service.searchCas({ offset: 5, limit: 10 })

      expect(qb.offset).toHaveBeenCalledWith(5)
      expect(qb.limit).toHaveBeenCalledWith(10)
    })
  })

  describe('createCas', () => {
    it('devrait sauvegarder le CAS', async () => {
      const created = { id: 'cas-1' } as CasEntity
      repository.save.mockResolvedValue(created)

      const result = await service.createCas({ name: 'my-cas' })

      expect(repository.save).toHaveBeenCalledWith({ name: 'my-cas' })
      expect(result).toBe(created)
    })
  })

  describe('updateCas', () => {
    it("devrait rejeter avec NotFoundResponse si le CAS n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.updateCas('unknown', { name: 'New' })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait fusionner les changements et sauvegarder', async () => {
      const cas = { id: 'cas-1', name: 'Old' } as CasEntity
      repository.findOne.mockResolvedValue(cas)
      repository.save.mockImplementation(async (c) => c as CasEntity)

      const result = await service.updateCas('cas-1', { name: 'New' })

      expect(result.name).toBe('New')
    })
  })

  describe('deleteCas / deleteCasByName', () => {
    it('devrait supprimer par id', async () => {
      await service.deleteCas('cas-1')

      expect(repository.delete).toHaveBeenCalledWith('cas-1')
    })

    it('devrait supprimer par nom', async () => {
      await service.deleteCasByName('my-cas')

      expect(repository.delete).toHaveBeenCalledWith({ name: 'my-cas' })
    })
  })

  describe('fromInput', () => {
    it('ne devrait pas toucher lmses si non fourni', async () => {
      const result = await service.fromInput({
        name: 'my-cas',
        loginURL: 'https://cas.test/login',
        serviceValidateURL: 'https://cas.test/validate',
        version: CasVersions.V3,
        lmses: [],
      })

      expect(result.lmses).toEqual([])
      expect(ltiService.findLmsById).not.toHaveBeenCalled()
    })

    it('devrait résoudre les LMS fournis', async () => {
      const lms = { id: 'lms-1' } as never
      ltiService.findLmsById.mockResolvedValue(Optional.of(lms))

      const result = await service.fromInput({
        name: 'my-cas',
        loginURL: 'https://cas.test/login',
        serviceValidateURL: 'https://cas.test/validate',
        version: CasVersions.V3,
        lmses: ['lms-1'],
      })

      expect(ltiService.findLmsById).toHaveBeenCalledWith('lms-1')
      expect(result.lmses).toEqual([lms])
    })

    it("devrait rejeter avec NotFoundResponse si un LMS fourni n'existe pas", async () => {
      ltiService.findLmsById.mockResolvedValue(Optional.empty())

      await expect(
        service.fromInput({
          name: 'my-cas',
          loginURL: 'https://cas.test/login',
          serviceValidateURL: 'https://cas.test/validate',
          version: CasVersions.V3,
          lmses: ['unknown'],
        })
      ).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })
})
