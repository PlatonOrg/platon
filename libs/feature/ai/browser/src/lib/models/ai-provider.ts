import { AiChat, StreamChunk } from '@platon/feature/ai/common'
import { Observable } from 'rxjs'

export abstract class AiProvider {
  abstract createChat(): Observable<AiChat>
  abstract getUserChats(): Observable<AiChat[]>
  abstract askStream(chatId: string, prompt: string): Observable<StreamChunk>
  abstract getChatMessages(chatId: string): Observable<AiChat>
}
