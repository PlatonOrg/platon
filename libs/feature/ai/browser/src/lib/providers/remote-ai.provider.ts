import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { AiProvider } from '../models/ai-provider'
import { AiChat, StreamChunk } from '@platon/feature/ai/common'
import { Observable } from 'rxjs'
import { TokenService } from '@platon/core/browser'

@Injectable()
export class RemoteAiProvider extends AiProvider {
  constructor(private readonly http: HttpClient, private readonly tokenService: TokenService) {
    super()
  }

  createChat(): Observable<AiChat> {
    return this.http.get<AiChat>('/api/v1/ai/create-chat', {})
  }

  getUserChats(): Observable<AiChat[]> {
    return this.http.get<AiChat[]>('/api/v1/ai/chats/me')
  }

  askStream(chatId: string, prompt: string): Observable<StreamChunk> {
    return new Observable<StreamChunk>((observer) => {
      const streamUrl = `/api/v1/ai/ask/${chatId}/stream`

      this.tokenService
        .token()
        .then((authToken) => {
          if (!authToken) {
            observer.error(new Error('No authentication token available'))
            return
          }

          fetch(streamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken.accessToken}`,
            },
            body: JSON.stringify({ prompt }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
              }

              if (!response.body) {
                throw new Error('No response body available')
              }

              const reader = response.body.getReader()
              const decoder = new TextDecoder()
              let buffer = ''

              const processStream = (): Promise<void> => {
                return reader.read().then(({ done, value }) => {
                  if (done) {
                    console.error('Stream finished')
                    observer.complete()
                    return
                  }

                  buffer += decoder.decode(value, { stream: true })

                  const lines = buffer.split('\n')
                  buffer = lines.pop() || ''

                  for (const line of lines) {
                    if (line.trim()) {
                      try {
                        const chunk: StreamChunk = JSON.parse(line)
                        observer.next(chunk)

                        if (chunk.type === 'end' || chunk.type === 'error') {
                          observer.complete()
                          return
                        }
                      } catch (error) {
                        console.error('Error parsing stream data:', error, 'Raw line:', line)
                        observer.error(new Error('Erreur de parsing des données du stream'))
                        return
                      }
                    }
                  }

                  // Continuer à lire le stream
                  return processStream()
                })
              }

              return processStream()
            })
            .catch((error) => {
              console.error('Fetch stream error:', error)
              observer.error(error)
            })
        })
        .catch((error) => {
          console.error('Token retrieval error:', error)
          observer.error(error)
        })

      return
    })
  }

  getChatMessages(chatId: string): Observable<AiChat> {
    return this.http.get<AiChat>(`/api/v1/ai/chats/${chatId}/messages`)
  }
}
