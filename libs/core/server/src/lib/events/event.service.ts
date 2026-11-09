import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class EventService {
  constructor(private eventEmitter: EventEmitter2) {}

  emit<T>(event: string, payload: T): boolean {
    return this.eventEmitter.emit(event, payload)
  }

  /**
   * Emits an event and waits for all its listeners.
   * The returned promise rejects if a listener declared with `suppressErrors: false` fails.
   */
  emitAsync<T>(event: string, payload: T): Promise<unknown[]> {
    return this.eventEmitter.emitAsync(event, payload)
  }
}
