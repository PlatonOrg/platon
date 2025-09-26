import { inject, Injectable } from '@angular/core'
import { AiProvider } from '../models/ai-provider'
import { AiChat, StreamChunk } from '@platon/feature/ai/common'
import { Observable } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class AiService extends AiProvider {
  private readonly provider = inject(AiProvider)

  createChat(): Observable<AiChat> {
    return this.provider.createChat()
  }
  getUserChats(): Observable<AiChat[]> {
    return this.provider.getUserChats()
  }

  askStream(chatId: string, prompt: string): Observable<StreamChunk> {
    return this.provider.askStream(chatId, prompt)
  }

  getChatMessages(chatId: string): Observable<AiChat> {
    return this.provider.getChatMessages(chatId)
  }
}
