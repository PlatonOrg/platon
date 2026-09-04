import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { AITransformInput, AITransformOutput } from '@platon/feature/builder/common'
import { BuilderAiProvider } from '../models/builder-ai.provider'

@Injectable({ providedIn: 'root' })
export class BuilderService {
  private readonly provider = inject(BuilderAiProvider)

  transformInputsWithAI(input: AITransformInput): Observable<AITransformOutput> {
    return this.provider.transformInputsWithAI(input)
  }
}
