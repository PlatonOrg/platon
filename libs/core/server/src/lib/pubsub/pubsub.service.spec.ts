import { PubSubService } from './pubsub.service'
import { PubSub } from './pubsub'

describe('PubSubService', () => {
  let service: PubSubService
  let pubSub: jest.Mocked<PubSub>

  beforeEach(() => {
    pubSub = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(1),
      unsubscribe: jest.fn(),
      asyncIterator: jest.fn(),
      asyncIteratorWithInitialValue: jest.fn(),
    } as unknown as jest.Mocked<PubSub>
    service = new PubSubService(pubSub)
  })

  it('devrait déléguer publish au PubSub sous-jacent', async () => {
    await service.publish('channel', { data: 1 })

    expect(pubSub.publish).toHaveBeenCalledWith('channel', { data: 1 })
  })

  it('devrait déléguer subscribe et retourner son id de souscription', async () => {
    const onMessage = jest.fn()

    const id = await service.subscribe('channel', onMessage)

    expect(pubSub.subscribe).toHaveBeenCalledWith('channel', onMessage)
    expect(id).toBe(1)
  })

  it('devrait déléguer unsubscribe', () => {
    service.unsubscribe(1)

    expect(pubSub.unsubscribe).toHaveBeenCalledWith(1)
  })

  describe('asyncIterator', () => {
    it("devrait utiliser asyncIterator quand aucune valeur initiale n'est fournie", () => {
      const iterator = {} as never
      pubSub.asyncIterator.mockReturnValue(iterator)

      const result = service.asyncIterator('channel')

      expect(pubSub.asyncIterator).toHaveBeenCalledWith('channel')
      expect(pubSub.asyncIteratorWithInitialValue).not.toHaveBeenCalled()
      expect(result).toBe(iterator)
    })

    it('devrait utiliser asyncIteratorWithInitialValue quand une valeur initiale est fournie', () => {
      const iterator = {} as never
      pubSub.asyncIteratorWithInitialValue.mockReturnValue(iterator)

      const result = service.asyncIterator('channel', { data: 1 })

      expect(pubSub.asyncIteratorWithInitialValue).toHaveBeenCalledWith('channel', { data: 1 })
      expect(pubSub.asyncIterator).not.toHaveBeenCalled()
      expect(result).toBe(iterator)
    })
  })
})
