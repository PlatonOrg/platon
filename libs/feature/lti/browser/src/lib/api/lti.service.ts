import { Injectable, inject } from '@angular/core'
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
import { LTIProvider } from '../models/lms-provider'

@Injectable({ providedIn: 'root' })
export class LTIService {
  private readonly provider = inject(LTIProvider)

  searchLms(filters?: LmsFilters): Observable<ListResponse<Lms>> {
    return this.provider.searchLms(filters)
  }

  findLms(id: string): Observable<Lms> {
    return this.provider.findLms(id)
  }

  updateLms(id: string, input: UpdateLms): Observable<Lms> {
    return this.provider.updateLms(id, input)
  }

  createLms(input: CreateLms): Observable<Lms> {
    return this.provider.createLms(input)
  }

  deleteLms(id: string): Observable<void> {
    return this.provider.deleteLms(id)
  }

  searchLtiPlatforms(search?: string): Observable<ListResponse<LtiPlatform>> {
    return this.provider.searchLtiPlatforms(search)
  }

  createLtiPlatform(input: CreateLtiPlatform): Observable<LtiPlatform> {
    return this.provider.createLtiPlatform(input)
  }

  updateLtiPlatform(id: string, input: UpdateLtiPlatform): Observable<LtiPlatform> {
    return this.provider.updateLtiPlatform(id, input)
  }

  deleteLtiPlatform(id: string): Observable<void> {
    return this.provider.deleteLtiPlatform(id)
  }

  getLtiToolConfig(): Observable<LtiToolConfig> {
    return this.provider.getLtiToolConfig()
  }
}
