import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { EventService } from '../events'
import { NameSimilarityService } from '../utils'
import { TopicEntity } from './topic.entity'
import { ON_TOPIC_FUSION_EVENT } from './topic.event'
import { TopicService } from './topic.service'

describe('TopicService', () => {
  let service: TopicService
  let repository: MockRepository<TopicEntity>
  let eventService: jest.Mocked<EventService>
  let nameSimilarity: jest.Mocked<NameSimilarityService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicService,
        { provide: getRepositoryToken(TopicEntity), useValue: mockRepository<TopicEntity>() },
        { provide: EventService, useValue: { emit: jest.fn() } },
        {
          provide: NameSimilarityService,
          useValue: { normalizeString: jest.fn((s) => s), calculateSimilarity: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(TopicService)
    repository = module.get(getRepositoryToken(TopicEntity))
    eventService = module.get(EventService)
    nameSimilarity = module.get(NameSimilarityService)
  })

  describe('findById', () => {
    it('devrait retourner Optional.of(topic) si trouvé', async () => {
      const topic = { id: 'topic-1' } as TopicEntity
      repository.findOne.mockResolvedValue(topic)

      const result = await service.findById('topic-1')

      expect(result.get()).toBe(topic)
    })

    it('devrait retourner Optional.empty() si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findById('unknown')

      expect(result.isPresent()).toBe(false)
    })
  })

  describe('findAll', () => {
    it('devrait retourner tous les topics triés par nom avec leur total', async () => {
      const topics = [{ id: 'topic-1' }] as TopicEntity[]
      repository.findAndCount.mockResolvedValue([topics, 1])

      const result = await service.findAll()

      expect(repository.findAndCount).toHaveBeenCalledWith({ order: { name: 'ASC' } })
      expect(result).toEqual([topics, 1])
    })
  })

  describe('create', () => {
    it('devrait créer directement le topic si force=true, sans chercher de doublon', async () => {
      const created = { id: 'topic-1', name: 'Topic 1' } as TopicEntity
      repository.save.mockResolvedValue(created)

      const result = await service.create({ name: 'Topic 1' }, true)

      expect(repository.findAndCount).not.toHaveBeenCalled()
      expect(result).toEqual({ topic: created, existing: false })
    })

    it('devrait retourner le topic existant si un topic similaire est trouvé', async () => {
      const similar = { id: 'topic-1', name: 'Topic I' } as TopicEntity
      repository.findAndCount.mockResolvedValue([[similar], 1])
      nameSimilarity.calculateSimilarity.mockReturnValue(0.9)

      const result = await service.create({ name: 'Topic 1' }, false)

      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toEqual({ topic: similar, existing: true })
    })

    it("devrait créer un nouveau topic si aucun topic similaire n'est trouvé", async () => {
      const other = { id: 'topic-1', name: 'Autre topic' } as TopicEntity
      repository.findAndCount.mockResolvedValue([[other], 1])
      nameSimilarity.calculateSimilarity.mockReturnValue(0.2)
      const created = { id: 'topic-2', name: 'Topic 1' } as TopicEntity
      repository.save.mockResolvedValue(created)

      const result = await service.create({ name: 'Topic 1' }, false)

      expect(result).toEqual({ topic: created, existing: false })
    })
  })

  describe('update', () => {
    it("devrait rejeter avec NotFoundResponse si le topic n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.update('unknown', { name: 'New' })).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it('devrait fusionner les changements et sauvegarder si le nom ne rentre pas en collision', async () => {
      const topic = { id: 'topic-1', name: 'Old' } as TopicEntity
      repository.findOne.mockResolvedValueOnce(topic).mockResolvedValueOnce(null)
      repository.save.mockImplementation(async (t) => t as TopicEntity)

      const result = await service.update('topic-1', { name: 'New' })

      expect(result.name).toBe('New')
      expect(eventService.emit).not.toHaveBeenCalled()
    })

    it('devrait fusionner deux topics si le nouveau nom est déjà pris par un autre topic et émettre un événement de fusion', async () => {
      const topic = { id: 'topic-1', name: 'Old' } as TopicEntity
      const conflicting = { id: 'topic-2', name: 'New' } as TopicEntity
      repository.findOne.mockResolvedValueOnce(topic).mockResolvedValueOnce(conflicting)
      repository.delete.mockResolvedValue({ affected: 1 } as never)

      const result = await service.update('topic-1', { name: 'New' })

      expect(eventService.emit).toHaveBeenCalledWith(ON_TOPIC_FUSION_EVENT, { oldTopic: topic, newTopic: conflicting })
      expect(repository.delete).toHaveBeenCalledWith('topic-1')
      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(conflicting)
    })
  })

  describe('delete', () => {
    it('devrait supprimer le topic via son id', async () => {
      await service.delete('topic-1')

      expect(repository.delete).toHaveBeenCalledWith('topic-1')
    })
  })
})
