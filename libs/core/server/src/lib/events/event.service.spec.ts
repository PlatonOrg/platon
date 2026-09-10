import { EventEmitter2 } from '@nestjs/event-emitter'
import { EventService } from './event.service'

describe('EventService', () => {
  it("devrait déléguer l'émission à EventEmitter2 et retourner son résultat", () => {
    const eventEmitter = { emit: jest.fn().mockReturnValue(true) } as unknown as EventEmitter2
    const service = new EventService(eventEmitter)

    const result = service.emit('some.event', { data: 42 })

    expect(eventEmitter.emit).toHaveBeenCalledWith('some.event', { data: 42 })
    expect(result).toBe(true)
  })
})
