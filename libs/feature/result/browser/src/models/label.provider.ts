import { CreateLabel, Label } from '@platon/feature/result/common'
import { Observable } from 'rxjs'

export abstract class LabelProvider {
  abstract listLabels(): Observable<Label[]>
  abstract createLabel(id: string, input: CreateLabel): Observable<Label[]>
  abstract labelize(sessionId: string, answerId: string, labelId: string): Observable<Label[]>
}
