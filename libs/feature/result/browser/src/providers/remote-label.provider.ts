import { Injectable } from '@angular/core'
import { LabelProvider } from '../models/label.provider'
import { HttpClient } from '@angular/common/http'
import { CreateLabel, Label } from '@platon/feature/result/common'
import { map, Observable } from 'rxjs'
import { ListResponse } from '@platon/core/common'

@Injectable()
export class RemoteLabelProvider extends LabelProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }
  listLabels(): Observable<Label[]> {
    return this.http.get<ListResponse<Label>>(`/api/v1/results/labels/list`).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  createLabel(id: string, input: CreateLabel): Observable<Label[]> {
    return this.http.post<ListResponse<Label>>(`/api/v1/results/labels/create/${id}`, input).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  labelize(sessionId: string, answerId: string, labelId: string): Observable<Label[]> {
    const input = {
      sessionId,
      answerId,
      labelId,
    }
    return this.http.post<ListResponse<Label>>(`/api/v1/results/labels/labelize`, input).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }
}
