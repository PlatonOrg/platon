import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { UserCharterProvider } from '../models/user-charter-provider'
import { ItemResponse, UserCharter } from '@platon/core/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable()
export class RemoteUserCharterProvider extends UserCharterProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  acceptUserCharter(userId: string): Observable<UserCharter> {
    return this.http
      .post<ItemResponse<UserCharter>>(`/api/v1/user-charter/accept`, { userId })
      .pipe(map((response) => response.resource))
  }

  findUserCharterById(userId: string): Observable<UserCharter> {
    return this.http
      .get<ItemResponse<UserCharter>>(`/api/v1/user-charter/${userId}`)
      .pipe(map((response) => response.resource))
  }
}
