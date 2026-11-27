import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { AITransformInput, AITransformOutput } from '@platon/feature/builder/common'
import { BuilderAiProvider } from '../models/builder-ai.provider'

@Injectable()
export class RemoteBuilderAiProvider extends BuilderAiProvider {
  private readonly http = inject(HttpClient)

  transformInputsWithAI(input: AITransformInput): Observable<AITransformOutput> {
    return this.http.post<AITransformOutput>('/api/v1/builder/transform', input)
  }
}
