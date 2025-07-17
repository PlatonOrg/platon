import { Injectable } from '@angular/core'
import { CreateTest, CreateTestsCandidates, Test, TestsCandidates } from '@platon/feature/tests/common'
import { TestsCandidatesProvider } from '../models/tests-candidates.provider'
import { firstValueFrom, Observable } from 'rxjs'
import { ListResponse } from '@platon/core/common'
import { Router } from '@angular/router'
import { TestProvider } from '../models/test.provider'
import { OutputData } from '@editorjs/editorjs'

@Injectable({ providedIn: 'root' })
export class TestsService {
  constructor(
    private readonly testsCandidatesProvider: TestsCandidatesProvider,
    private readonly testProvider: TestProvider,
    private readonly router: Router
  ) {}

  createTest(input: CreateTest): Observable<Test> {
    return this.testProvider.createTest(input)
  }

  getTestByCourseId(courseId: string): Observable<Test> {
    return this.testProvider.getTestByCourseId(courseId)
  }

  getCompletedTestTerms(testId: string): Observable<OutputData> {
    return this.testProvider.getCompletedTestTerms(testId)
  }

  updateTestTerms(testId: string, terms: OutputData): Observable<void> {
    return this.testProvider.updateTestTerms(testId, terms)
  }

  updateTestMailContent(testId: string, mailContent: OutputData, mailSubject: string): Observable<void> {
    return this.testProvider.updateTestMailContent(testId, mailContent, mailSubject)
  }

  createManyTestsCandidates(input: CreateTestsCandidates[]): Observable<ListResponse<TestsCandidates>> {
    return this.testsCandidatesProvider.createMany(input)
  }

  async signInWithInvitation(invitationId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.testsCandidatesProvider.signInWithInvitation(invitationId))
      await this.router.navigate(['/login'], {
        queryParams: {
          'access-token': response.resource.authToken.accessToken,
          'refresh-token': response.resource.authToken.refreshToken,
          next: `/candidate/terms?id=${response.resource.testId}`,
        },
        replaceUrl: true,
      })
      return true
    } catch (error) {
      return false
    }
  }

  sendAllMails(testId: string): Observable<void> {
    return this.testProvider.sendAllMails(testId)
  }

  sendMailToCandidate(testId: string, courseMemberId: string): Observable<void> {
    return this.testProvider.sendMailToCandidate(testId, courseMemberId)
  }
}
