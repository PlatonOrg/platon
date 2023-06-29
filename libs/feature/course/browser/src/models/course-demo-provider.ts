import {
  CourseDemo,
  CourseDemoAccessAnswer,
} from '@platon/feature/course/common';
import { Observable } from 'rxjs';

export abstract class CourseDemoProvider {
  abstract access(uri: string): Observable<CourseDemoAccessAnswer>;
  abstract create(courseId: string): Observable<CourseDemo>;
}
