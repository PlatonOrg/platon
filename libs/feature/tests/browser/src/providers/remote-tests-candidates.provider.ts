import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { ItemResponse, ListResponse } from '@platon/core/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { TestsCandidatesProvider } from '../models/tests-candidates.provider'
import { CandidateSignInResponse, CreateTestsCandidates, TestsCandidates } from '@platon/feature/tests/common'

@Injectable()
export class RemoteTestsCandidatesProvider extends TestsCandidatesProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  createMany(input: CreateTestsCandidates[]): Observable<ListResponse<TestsCandidates>> {
    return this.http
      .post<ListResponse<TestsCandidates>>('/api/v1/tests-candidates/create-many', input)
      .pipe(map((response) => new ListResponse<TestsCandidates>(response)))
  }

  signInWithInvitation(invitationId: string): Observable<ItemResponse<CandidateSignInResponse>> {
    return this.http
      .post<ItemResponse<CandidateSignInResponse>>('/api/v1/tests-candidates/sign-in-with-invitation', { invitationId })
      .pipe(map((response) => new ItemResponse<CandidateSignInResponse>(response)))
  }
}
