import { Test, TestingModule } from '@nestjs/testing'
import { ResourceEventController } from './event.controller'
import { ResourceEventEntity } from './event.entity'
import { ResourceEventService } from './event.service'

describe('ResourceEventController', () => {
  let controller: ResourceEventController
  let service: jest.Mocked<ResourceEventService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceEventController],
      providers: [{ provide: ResourceEventService, useValue: { search: jest.fn() } }],
    }).compile()

    controller = module.get(ResourceEventController)
    service = module.get(ResourceEventService)
  })

  describe('search', () => {
    it('devrait déléguer au service et retourner les événements mappés avec le total', async () => {
      service.search.mockResolvedValue([[{ id: 'event-1' } as ResourceEventEntity], 1])

      const result = await controller.search('resource-1', {})

      expect(service.search).toHaveBeenCalledWith('resource-1', {})
      expect(result.total).toBe(1)
    })
  })
})
