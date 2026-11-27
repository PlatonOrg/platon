import { Test, TestingModule } from '@nestjs/testing'
import { TopicController } from './topic.controller'
import { TopicService } from './topic.service'
import { TopicEntity } from './topic.entity'

describe('TopicController', () => {
  let controller: TopicController
  let service: jest.Mocked<TopicService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopicController],
      providers: [
        {
          provide: TopicService,
          useValue: { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get(TopicController)
    service = module.get(TopicService)
  })

  describe('list', () => {
    it('devrait retourner tous les topics mappés avec le total', async () => {
      const topics = [{ id: 'topic-1', name: 'Topic 1' }] as TopicEntity[]
      service.findAll.mockResolvedValue([topics, 1])

      const result = await controller.list()

      expect(result.total).toBe(1)
      expect(result.resources[0].name).toBe('Topic 1')
    })
  })

  describe('create', () => {
    it("devrait créer un topic et refléter le drapeau 'existing' dans la ressource", async () => {
      const topic = { id: 'topic-1', name: 'Topic 1' } as TopicEntity
      service.create.mockResolvedValue({ topic, existing: true })

      const result = await controller.create({ name: 'Topic 1' })

      expect(service.create).toHaveBeenCalledWith({ name: 'Topic 1' }, false)
      expect(result.resource.existing).toBe(true)
      expect(result.resource.name).toBe('Topic 1')
    })

    it('devrait transmettre force=true au service quand demandé', async () => {
      const topic = { id: 'topic-1', name: 'Topic 1' } as TopicEntity
      service.create.mockResolvedValue({ topic, existing: false })

      await controller.create({ name: 'Topic 1', force: true })

      expect(service.create).toHaveBeenCalledWith({ name: 'Topic 1', force: true }, true)
    })
  })

  describe('update', () => {
    it('devrait déléguer au service et retourner la ressource mappée', async () => {
      const updated = { id: 'topic-1', name: 'Renamed' } as TopicEntity
      service.update.mockResolvedValue(updated)

      const result = await controller.update('topic-1', { name: 'Renamed' })

      expect(service.update).toHaveBeenCalledWith('topic-1', { name: 'Renamed' })
      expect(result.resource.name).toBe('Renamed')
    })
  })

  describe('delete', () => {
    it('devrait déléguer la suppression au service', async () => {
      await controller.delete('topic-1')

      expect(service.delete).toHaveBeenCalledWith('topic-1')
    })
  })
})
