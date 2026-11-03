import { ListResponse } from '@platon/core/common'
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

export abstract class LTIProvider {
  abstract searchLms(filters?: LmsFilters): Observable<ListResponse<Lms>>
  abstract findLms(id: string, markAsViewed?: boolean): Observable<Lms>
  abstract updateLms(id: string, input: UpdateLms): Observable<Lms>
  abstract createLms(input: CreateLms): Observable<Lms>
  abstract deleteLms(id: string): Observable<void>

  abstract searchLtiPlatforms(search?: string): Observable<ListResponse<LtiPlatform>>
  abstract createLtiPlatform(input: CreateLtiPlatform): Observable<LtiPlatform>
  abstract updateLtiPlatform(id: string, input: UpdateLtiPlatform): Observable<LtiPlatform>
  abstract deleteLtiPlatform(id: string): Observable<void>
  abstract getLtiToolConfig(): Observable<LtiToolConfig>
}
