import { ExpandableModel, ListResponse } from '@platon/core/common'
import {
  CircleTree,
  CreateResource,
  FindResource,
  Resource,
  ResourceCompletion,
  ResourceExpandableFields,
  ResourceFilters,
  ResourceStatisic,
  UpdateResource,
} from '@platon/feature/resource/common'
import { Observable } from 'rxjs'

export interface ResourceFindOptions {
  markAsView?: boolean
  expands?: ResourceExpandableFields[]
}

export abstract class ResourceProvider {
  abstract tree(): Observable<CircleTree>
  abstract circle(username: string, expands?: ExpandableModel): Observable<Resource>
  abstract statistic(resource: Resource): Observable<ResourceStatisic>
  abstract completion(): Observable<ResourceCompletion>
  abstract search(filters?: ResourceFilters): Observable<ListResponse<Resource>>
  abstract find(input: FindResource): Observable<Resource>
  abstract update(id: string, input: UpdateResource): Observable<Resource>
  abstract create(input: CreateResource): Observable<Resource>
}
