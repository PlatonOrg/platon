import { CreateLabel, Label } from '@platon/feature/result/common'
import { Observable } from 'rxjs'

export abstract class LabelProvider {
  abstract listLabels(courseId: string): Observable<Label[]>
  abstract createLabel(courseId: string, input: CreateLabel): Observable<Label[]>
  abstract labelize(sessionId: string, answerId: string, labelId: string): Observable<Label[]>
  abstract listCorrectionLabels(sessionId: string, answerId: string): Observable<Label[]>
  abstract listFavLabels(): Observable<Label[]>
  abstract favLabel(labelId: string): Observable<Label[]>
  abstract unfavLabel(labelId: string): Observable<Label[]>
}
