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
  listLabels(navigationExerciseId: string): Observable<Label[]> {
    return this.http.get<ListResponse<Label>>(`/api/v1/results/labels/list/${navigationExerciseId}`).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  createLabel(activityId: string, navigationExerciseId: string, input: CreateLabel): Observable<Label[]> {
    return this.http
      .post<ListResponse<Label>>(`/api/v1/results/labels/create/${activityId}/${navigationExerciseId}`, input)
      .pipe(
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

  listCorrectionLabels(sessionId: string, answerId: string): Observable<Label[]> {
    return this.http.get<ListResponse<Label>>(`/api/v1/results/labels/list-correction/${sessionId}/${answerId}`).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  listFavLabels(): Observable<Label[]> {
    return this.http.get<ListResponse<Label>>(`/api/v1/results/labels/userFavLabel`).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  favLabel(labelId: string): Observable<Label[]> {
    return this.http.post<ListResponse<Label>>(`/api/v1/results/labels/fav/${labelId}`, {}).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  unfavLabel(labelId: string): Observable<Label[]> {
    return this.http.post<ListResponse<Label>>(`/api/v1/results/labels/unfav/${labelId}`, {}).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  deleteLabel(labelId: string): Observable<Label[]> {
    return this.http.delete<ListResponse<Label>>(`/api/v1/results/labels/delete/${labelId}`).pipe(
      map((response: ListResponse<Label>) => {
        return response.resources
      })
    )
  }

  updateLabel(label: Partial<Label>, navigationExerciseId: string): Observable<Label> {
    return this.http.patch<void>(`/api/v1/results/labels/update/${navigationExerciseId}`, label).pipe(
      map(() => {
        return label as Label
      })
    )
  }
}
