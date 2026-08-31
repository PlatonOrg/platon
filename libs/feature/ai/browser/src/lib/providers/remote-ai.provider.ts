import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { AiProvider } from '../models/ai-provider'

@Injectable()
export class RemoteAiProvider extends AiProvider {
  private readonly http = inject(HttpClient)
}
