import { ItemResponse, ListResponse } from '@platon/core/common'
import { CandidateSignInResponse, CreateTestsCandidates, TestsCandidates } from '@platon/feature/tests/common'
import { Observable } from 'rxjs'

export abstract class TestsCandidatesProvider {
  abstract createMany(input: CreateTestsCandidates[]): Observable<ListResponse<TestsCandidates>>
  abstract signInWithInvitation(invitationId: string): Observable<ItemResponse<CandidateSignInResponse>>
}
