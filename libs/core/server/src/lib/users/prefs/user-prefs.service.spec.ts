import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { Optional } from 'typescript-optional'
import { LevelService } from '../../levels'
import { TopicService } from '../../topics'
import { UserPrefsEntity } from './user-prefs.entity'
import { UserPrefsService } from './user-prefs.service'

describe('UserPrefsService', () => {
  let service: UserPrefsService
  let repository: MockRepository<UserPrefsEntity>
  let levelService: jest.Mocked<LevelService>
  let topicService: jest.Mocked<TopicService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPrefsService,
        { provide: getRepositoryToken(UserPrefsEntity), useValue: mockRepository<UserPrefsEntity>() },
        { provide: LevelService, useValue: { findById: jest.fn() } },
        { provide: TopicService, useValue: { findById: jest.fn() } },
      ],
    }).compile()

    service = module.get(UserPrefsService)
    repository = module.get(getRepositoryToken(UserPrefsEntity))
    levelService = module.get(LevelService)
    topicService = module.get(TopicService)
  })

  describe('onLevelFusion', () => {
    it("devrait remplacer l'ancien niveau par le nouveau dans chaque préférence et sauvegarder", async () => {
      const oldLevel = { id: 'old-level' } as never
      const newLevel = { id: 'new-level' } as never
      const pref = { id: 'pref-1', levels: [oldLevel, { id: 'other-level' }] } as unknown as UserPrefsEntity
      const qb = mockSelectQueryBuilder<UserPrefsEntity>()
      qb.getMany.mockResolvedValue([pref])
      repository.createQueryBuilder.mockReturnValue(qb)
      repository.save.mockImplementation(async (p) => p as UserPrefsEntity)

      await service.onLevelFusion({ oldLevel, newLevel })

      expect(pref.levels).toEqual([newLevel, { id: 'other-level' }])
      expect(repository.save).toHaveBeenCalledWith(pref)
    })
  })

  describe('onTopicFusion', () => {
    it("devrait remplacer l'ancien topic par le nouveau dans chaque préférence et sauvegarder", async () => {
      const oldTopic = { id: 'old-topic' } as never
      const newTopic = { id: 'new-topic' } as never
      const pref = { id: 'pref-1', topics: [oldTopic] } as unknown as UserPrefsEntity
      const qb = mockSelectQueryBuilder<UserPrefsEntity>()
      qb.getMany.mockResolvedValue([pref])
      repository.createQueryBuilder.mockReturnValue(qb)
      repository.save.mockImplementation(async (p) => p as UserPrefsEntity)

      await service.onTopicFusion({ oldTopic, newTopic })

      expect(pref.topics).toEqual([newTopic])
      expect(repository.save).toHaveBeenCalledWith(pref)
    })
  })

  describe('findByUserId', () => {
    it('devrait retourner les préférences existantes sans les recréer', async () => {
      const prefs = { id: 'prefs-1', userId: 'user-1' } as UserPrefsEntity
      repository.findOne.mockResolvedValue(prefs)

      const result = await service.findByUserId('user-1')

      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(prefs)
    })

    it("devrait créer des préférences vides si elles n'existent pas encore", async () => {
      repository.findOne.mockResolvedValue(null)
      const created = { userId: 'user-1', levels: [], topics: [] } as unknown as UserPrefsEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.findByUserId('user-1')

      expect(repository.create).toHaveBeenCalledWith({ userId: 'user-1', levels: [], topics: [] })
      expect(repository.save).toHaveBeenCalledWith(created)
      expect(result).toBe(created)
    })
  })

  describe('updateByUserId', () => {
    it('devrait fusionner les changements avec les préférences existantes puis sauvegarder', async () => {
      const prefs = { id: 'prefs-1', userId: 'user-1', levels: [], topics: [] } as unknown as UserPrefsEntity
      repository.findOne.mockResolvedValue(prefs)
      repository.save.mockImplementation(async (p) => p as UserPrefsEntity)

      const newLevels = [{ id: 'level-1' }] as never
      const result = await service.updateByUserId('user-1', { levels: newLevels })

      expect(result.levels).toBe(newLevels)
      expect(repository.save).toHaveBeenCalledWith(prefs)
    })
  })

  describe('fromInput', () => {
    it("devrait retourner une entité sans niveaux ni topics si aucun n'est fourni", async () => {
      const result = await service.fromInput({})

      expect(result.levels).toBeUndefined()
      expect(result.topics).toBeUndefined()
      expect(levelService.findById).not.toHaveBeenCalled()
      expect(topicService.findById).not.toHaveBeenCalled()
    })

    it('devrait résoudre les niveaux fournis via LevelService', async () => {
      const level = { id: 'level-1', name: 'Level 1' } as never
      levelService.findById.mockResolvedValue(Optional.of(level))

      const result = await service.fromInput({ levels: ['level-1'] })

      expect(levelService.findById).toHaveBeenCalledWith('level-1')
      expect(result.levels).toEqual([level])
    })

    it("devrait rejeter avec NotFoundResponse si un niveau fourni n'existe pas", async () => {
      levelService.findById.mockResolvedValue(Optional.empty())

      await expect(service.fromInput({ levels: ['unknown'] })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait résoudre les topics fournis via TopicService', async () => {
      const topic = { id: 'topic-1', name: 'Topic 1' } as never
      topicService.findById.mockResolvedValue(Optional.of(topic))

      const result = await service.fromInput({ topics: ['topic-1'] })

      expect(topicService.findById).toHaveBeenCalledWith('topic-1')
      expect(result.topics).toEqual([topic])
    })

    it("devrait rejeter avec NotFoundResponse si un topic fourni n'existe pas", async () => {
      topicService.findById.mockResolvedValue(Optional.empty())

      await expect(service.fromInput({ topics: ['unknown'] })).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })
})
