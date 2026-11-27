import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { CreatedResponse, ItemResponse, ListResponse } from '@platon/core/common'
import {
  CreateLms,
  CreateLtiPlatform,
  Lms,
  LmsFilters,
  LtiPlatform,
  LtiToolConfig,
  UpdateLms,
  UpdateLtiPlatform,
} from '@platon/feature/lti/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { LTIProvider } from '../models/lms-provider'

@Injectable()
export class RemoteLTIProvider extends LTIProvider {
  private readonly http = inject(HttpClient)

  searchLms(filters?: LmsFilters): Observable<ListResponse<Lms>> {
    filters = filters || {}
    let params = new HttpParams()

    if (filters.search) {
      params = params.append('search', filters.search)
    }

    if (filters.order) {
      params = params.append('order', filters.order)
    }

    if (filters.direction) {
      params = params.append('direction', filters.direction)
    }

    if (filters.limit) {
      params = params.append('limit', filters.limit.toString())
    }

    if (filters.offset) {
      params = params.append('offset', filters.offset.toString())
    }

    return this.http.get<ListResponse<Lms>>(`/api/v1/lti/lms`, { params })
  }

  findLms(id: string): Observable<Lms> {
    return this.http.get<ItemResponse<Lms>>(`/api/v1/lti/lms/${id}`).pipe(map((response) => response.resource))
  }

  updateLms(id: string, input: UpdateLms): Observable<Lms> {
    return this.http.patch<ItemResponse<Lms>>(`/api/v1/lti/lms/${id}`, input).pipe(map((response) => response.resource))
  }

  createLms(input: CreateLms): Observable<Lms> {
    return this.http.post<CreatedResponse<Lms>>('/api/v1/lti/lms', input).pipe(map((response) => response.resource))
  }

  deleteLms(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/lti/lms/${id}`)
  }

  searchLtiPlatforms(search?: string): Observable<ListResponse<LtiPlatform>> {
    const params = search ? new HttpParams().set('search', search) : new HttpParams()
    return this.http.get<ListResponse<LtiPlatform>>('/api/v1/lti/platforms', { params })
  }

  createLtiPlatform(input: CreateLtiPlatform): Observable<LtiPlatform> {
    return this.http
      .post<CreatedResponse<LtiPlatform>>('/api/v1/lti/platforms', input)
      .pipe(map((response) => response.resource))
  }

  updateLtiPlatform(id: string, input: UpdateLtiPlatform): Observable<LtiPlatform> {
    return this.http
      .patch<ItemResponse<LtiPlatform>>(`/api/v1/lti/platforms/${id}`, input)
      .pipe(map((response) => response.resource))
  }

  deleteLtiPlatform(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/lti/platforms/${id}`)
  }

  getLtiToolConfig(): Observable<LtiToolConfig> {
    return this.http
      .get<ItemResponse<LtiToolConfig>>('/api/v1/lti/platforms/config')
      .pipe(map((response) => response.resource))
  }
}
