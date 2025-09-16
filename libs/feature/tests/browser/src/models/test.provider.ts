import { OutputData } from '@editorjs/editorjs'
import { CreateTest, Test } from '@platon/feature/tests/common'
import { Observable } from 'rxjs'

export abstract class TestProvider {
  abstract createTest(input: CreateTest): Observable<Test>
  abstract getTestByCourseId(courseId: string): Observable<Test>
  abstract getCompletedTestTerms(testId: string): Observable<OutputData>
  abstract updateTestTerms(testId: string, terms: OutputData): Observable<void>
  abstract updateTestMailContent(testId: string, mailContent: OutputData, mailSubject: string): Observable<void>
  abstract sendAllMails(testId: string): Observable<void>
  abstract sendMailToCandidate(testId: string, courseMemberId: string): Observable<void>
}
