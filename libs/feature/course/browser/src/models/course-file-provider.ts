import { Observable } from 'rxjs'

export interface CourseFileUploadResponse {
  readonly success: 1
  readonly file: { readonly url: string }
}

export abstract class CourseFileProvider {
  abstract upload(
    courseId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Observable<CourseFileUploadResponse>
}
