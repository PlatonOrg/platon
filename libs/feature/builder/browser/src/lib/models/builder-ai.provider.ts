import { Observable } from 'rxjs'
import { AITransformInput, AITransformOutput } from '@platon/feature/builder/common'

export abstract class BuilderAiProvider {
  abstract transformInputsWithAI(input: AITransformInput): Observable<AITransformOutput>
}
