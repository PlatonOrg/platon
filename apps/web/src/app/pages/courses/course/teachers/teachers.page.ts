import { ChangeDetectionStrategy, Component } from '@angular/core'

import { CourseMembersPage } from '../members/members.page'

@Component({
  selector: 'app-course-teachers',
  templateUrl: './teachers.page.html',
  styleUrls: ['./teachers.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CourseMembersPage],
})
export class CourseTeachersPage {}
