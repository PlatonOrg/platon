import { Injectable } from '@angular/core';
import { CourseDemoProvider } from '../models/course-demo-provider';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  CourseDemo,
  CourseDemoAccessAnswer,
} from '@platon/feature/course/common';
import { ItemResponse } from '@platon/core/common';

@Injectable()
export class RemoteCourseDemoProvider extends CourseDemoProvider {
  constructor(private readonly http: HttpClient) {
    super();
  }

  access(uri: string): Observable<CourseDemoAccessAnswer> {
    return this.http
      .get<ItemResponse<CourseDemoAccessAnswer>>('/api/v1/courses/demo/' + uri)
      .pipe(map((response) => response.resource));
  }
  create(courseId: string): Observable<CourseDemo> {
    return this.http
      .post<ItemResponse<CourseDemo>>('/api/v1/courses/demo', { id: courseId })
      .pipe(map((response) => response.resource));
  }
}
