import { Injectable } from '@angular/core'
import { TestProvider } from '../models/test.provider'
import { HttpClient } from '@angular/common/http'
import { ItemResponse } from '@platon/core/common'
import { CreateTest, Test } from '@platon/feature/tests/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { OutputData } from '@editorjs/editorjs'

@Injectable()
export class RemoteTestProvider extends TestProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  createTest(input: CreateTest): Observable<Test> {
    return this.http.post<ItemResponse<Test>>('/api/v1/test/create', input).pipe(map((response) => response.resource))
  }

  getTestByCourseId(courseId: string): Observable<Test> {
    return this.http
      .get<ItemResponse<Test>>(`/api/v1/test/course/${courseId}`)
      .pipe(map((response) => response.resource))
  }

  getCompletedTestTerms(testId: string): Observable<OutputData> {
    return this.http
      .get<ItemResponse<OutputData>>(`/api/v1/test/${testId}/completed-terms`)
      .pipe(map((response) => response.resource))
  }

  updateTestTerms(testId: string, terms: OutputData): Observable<void> {
    return this.http.post<void>(`/api/v1/test/${testId}/terms`, { terms })
  }

  updateTestMailContent(testId: string, mailContent: OutputData, mailSubject: string): Observable<void> {
    return this.http.post<void>(`/api/v1/test/${testId}/mail-content`, { mailContent, mailSubject })
  }

  sendAllMails(testId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/test/${testId}/send-all-mails`, {})
  }

  sendMailToCandidate(testId: string, courseMemberId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/test/${testId}/send-mail/${courseMemberId}`, {})
  }
}
