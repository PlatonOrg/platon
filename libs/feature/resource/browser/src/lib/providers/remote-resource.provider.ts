import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { buildExpandableHttpParams, buildHttpParams } from '@platon/core/browser'
import { ItemResponse, ListResponse } from '@platon/core/common'
import {
  CircleTree,
  CreateResource,
  FindResource,
  Resource,
  ResourceCompletion,
  ResourceFilters,
  UpdateResource,
} from '@platon/feature/resource/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ResourceProvider } from '../models/resource-provider'
@Injectable()
export class RemoteResourceProvider extends ResourceProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  tree(): Observable<CircleTree> {
    return this.http.get<ItemResponse<CircleTree>>('/api/v1/resources/tree').pipe(map((response) => response.resource))
  }

  circle(username: string): Observable<Resource> {
    return this.http
      .get<ItemResponse<Resource>>(`/api/v1/users/${username}/circle`)
      .pipe(map((response) => response.resource))
  }
  completion(): Observable<ResourceCompletion> {
    return this.http
      .get<ItemResponse<ResourceCompletion>>('/api/v1/resources/completion')
      .pipe(map((response) => response.resource))
  }

  search(filters?: ResourceFilters): Observable<ListResponse<Resource>> {
    filters = filters || {}
    const params = buildHttpParams(filters)
    return this.http.get<ListResponse<Resource>>(`/api/v1/resources`, { params })
  }

  find(input: FindResource): Observable<Resource> {
    let params = buildExpandableHttpParams(input)
    if (input.markAsViewed) {
      params = params.append('markAsViewed', 'true')
    }

    return this.http
      .get<ItemResponse<Resource>>(`/api/v1/resources/${input.id}`, {
        params,
      })
      .pipe(map((response) => response.resource))
  }

  update(id: string, input: UpdateResource): Observable<Resource> {
    const params = buildExpandableHttpParams(input)

    return this.http
      .patch<ItemResponse<Resource>>(`/api/v1/resources/${id}`, input, {
        params,
      })
      .pipe(map((response) => response.resource))
  }

  create(input: CreateResource): Observable<Resource> {
    const params = buildExpandableHttpParams(input)

    return this.http
      .post<ItemResponse<Resource>>('/api/v1/resources', input, {
        params,
      })
      .pipe(map((response) => response.resource))
  }
}
