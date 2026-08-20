import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { CourseFileProvider, CourseFileUploadResponse } from '../models/course-file-provider'

@Injectable()
export class RemoteCourseFileProvider extends CourseFileProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  upload(courseId: string, file: File): Observable<CourseFileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file, file.name)
    return this.http.post<CourseFileUploadResponse>(`/api/v1/courses/${courseId}/files`, formData)
  }
}
