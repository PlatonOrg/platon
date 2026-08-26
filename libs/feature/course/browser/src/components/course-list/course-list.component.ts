import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, input, output } from '@angular/core'

import { NzEmptyModule } from 'ng-zorro-antd/empty'

import { NgeUiListModule } from '@cisstech/nge/ui/list'

import { Course } from '@platon/feature/course/common'
import { CourseItemComponent } from '../course-item/course-item.component'

@Component({
  selector: 'course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzEmptyModule, NgeUiListModule, CourseItemComponent],
})
export class CourseListComponent {
  @Input() items: Course[] = []
  @Input() simple = false

  readonly showArchiveButton = input<boolean>(false)
  readonly isArchived = input<boolean>(false)
  readonly archiveToggle = output<Course>()
}
