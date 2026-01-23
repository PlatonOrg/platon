import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { AITransformInput, AITransformOutput } from '@platon/feature/builder/common'
import { BuilderAiProvider } from '../models/builder-ai.provider'

@Injectable()
export class RemoteBuilderAiProvider extends BuilderAiProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  transformInputsWithAI(input: AITransformInput): Observable<AITransformOutput> {
    return this.http.post<AITransformOutput>('/api/v1/builder/transform', input)
  }
}
