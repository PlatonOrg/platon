import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { EventService } from '../events'
import { StringUtilsService } from '../utils'
import { LevelEntity } from './level.entity'
import { ON_LEVEL_FUSION_EVENT } from './level.event'
import { LevelService } from './level.service'

describe('LevelService', () => {
  let service: LevelService
  let repository: MockRepository<LevelEntity>
  let eventService: jest.Mocked<EventService>
  let stringUtils: jest.Mocked<StringUtilsService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelService,
        { provide: getRepositoryToken(LevelEntity), useValue: mockRepository<LevelEntity>() },
        { provide: EventService, useValue: { emit: jest.fn() } },
        {
          provide: StringUtilsService,
          useValue: { normalizeString: jest.fn((s) => s), calculateSimilarity: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(LevelService)
    repository = module.get(getRepositoryToken(LevelEntity))
    eventService = module.get(EventService)
    stringUtils = module.get(StringUtilsService)
  })

  describe('findById', () => {
    it('devrait retourner Optional.of(level) si trouvé', async () => {
      const level = { id: 'level-1' } as LevelEntity
      repository.findOne.mockResolvedValue(level)

      const result = await service.findById('level-1')

      expect(result.get()).toBe(level)
    })

    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findById('unknown')

      expect(result.isPresent()).toBe(false)
    })
  })

  describe('findAll', () => {
    it('devrait retourner tous les niveaux avec leur total', async () => {
      const levels = [{ id: 'level-1' }] as LevelEntity[]
      repository.findAndCount.mockResolvedValue([levels, 1])

      const result = await service.findAll()

      expect(result).toEqual([levels, 1])
    })
  })

  describe('create', () => {
    it('devrait créer directement le niveau si force=true, sans chercher de doublon', async () => {
      const created = { id: 'level-1', name: 'Niveau 1' } as LevelEntity
      repository.save.mockResolvedValue(created)

      const result = await service.create({ name: 'Niveau 1' }, true)

      expect(repository.findAndCount).not.toHaveBeenCalled()
      expect(result).toEqual({ level: created, existing: false })
    })

    it('devrait retourner le niveau existant si un niveau similaire est trouvé', async () => {
      const similar = { id: 'level-1', name: 'Niveau I' } as LevelEntity
      repository.findAndCount.mockResolvedValue([[similar], 1])
      stringUtils.calculateSimilarity.mockReturnValue(0.9)

      const result = await service.create({ name: 'Niveau 1' }, false)

      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toEqual({ level: similar, existing: true })
    })

    it("devrait créer un nouveau niveau si aucun niveau similaire n'est trouvé", async () => {
      const other = { id: 'level-1', name: 'Autre niveau' } as LevelEntity
      repository.findAndCount.mockResolvedValue([[other], 1])
      stringUtils.calculateSimilarity.mockReturnValue(0.2)
      const created = { id: 'level-2', name: 'Niveau 1' } as LevelEntity
      repository.save.mockResolvedValue(created)

      const result = await service.create({ name: 'Niveau 1' }, false)

      expect(result).toEqual({ level: created, existing: false })
    })

    it("ne devrait pas chercher de doublon si aucun nom n'est fourni", async () => {
      repository.findAndCount.mockResolvedValue([[], 0])
      const created = {} as LevelEntity
      repository.save.mockResolvedValue(created)

      const result = await service.create({}, false)

      expect(stringUtils.calculateSimilarity).not.toHaveBeenCalled()
      expect(result).toEqual({ level: created, existing: false })
    })
  })

  describe('update', () => {
    it("devrait rejeter avec NotFoundResponse si le niveau n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.update('unknown', { name: 'New' })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait fusionner les changements et sauvegarder si le nom ne rentre pas en collision', async () => {
      const level = { id: 'level-1', name: 'Old' } as LevelEntity
      repository.findOne.mockResolvedValueOnce(level).mockResolvedValueOnce(null)
      repository.save.mockImplementation(async (l) => l as LevelEntity)

      const result = await service.update('level-1', { name: 'New' })

      expect(result.name).toBe('New')
      expect(eventService.emit).not.toHaveBeenCalled()
    })

    it('devrait fusionner deux niveaux si le nouveau nom est déjà pris par un autre niveau et émettre un événement de fusion', async () => {
      const level = { id: 'level-1', name: 'Old' } as LevelEntity
      const conflicting = { id: 'level-2', name: 'New' } as LevelEntity
      repository.findOne.mockResolvedValueOnce(level).mockResolvedValueOnce(conflicting)
      repository.delete.mockResolvedValue({ affected: 1 } as never)

      const result = await service.update('level-1', { name: 'New' })

      expect(eventService.emit).toHaveBeenCalledWith(ON_LEVEL_FUSION_EVENT, { oldLevel: level, newLevel: conflicting })
      expect(repository.delete).toHaveBeenCalledWith('level-1')
      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(conflicting)
    })

    it('ne devrait pas chercher de collision si le nom ne change pas', async () => {
      const level = { id: 'level-1', name: 'Old' } as LevelEntity
      repository.findOne.mockResolvedValueOnce(level)
      repository.save.mockImplementation(async (l) => l as LevelEntity)

      await service.update('level-1', { name: undefined })

      expect(repository.findOne).toHaveBeenCalledTimes(1)
    })
  })

  describe('delete', () => {
    it('devrait supprimer le niveau via son id', async () => {
      await service.delete('level-1')

      expect(repository.delete).toHaveBeenCalledWith('level-1')
    })
  })
})
