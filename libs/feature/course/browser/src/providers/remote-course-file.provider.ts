import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { filter, map, tap } from 'rxjs/operators'
import { CourseFileProvider, CourseFileUploadResponse } from '../models/course-file-provider'

@Injectable()
export class RemoteCourseFileProvider extends CourseFileProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  upload(courseId: string, file: File, onProgress?: (percent: number) => void): Observable<CourseFileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file, file.name)

    return this.http
      .post<CourseFileUploadResponse>(`/api/v1/courses/${courseId}/files`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        tap((event) => {
          if (onProgress && event.type === HttpEventType.UploadProgress) {
            const total = event.total || file.size
            onProgress(total ? Math.round((100 * event.loaded) / total) : 0)
          }
        }),
        filter((event): event is HttpResponse<CourseFileUploadResponse> => event.type === HttpEventType.Response),
        map((event) => event.body as CourseFileUploadResponse)
      )
  }
}
