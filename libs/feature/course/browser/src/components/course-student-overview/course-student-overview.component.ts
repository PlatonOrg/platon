import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { RouterModule } from '@angular/router'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzProgressModule } from 'ng-zorro-antd/progress'

import { Activity, Course, CourseSection } from '@platon/feature/course/common'

interface SectionItems {
  readonly section: CourseSection
  readonly activities: Activity[]
}

@Component({
  standalone: true,
  selector: 'course-student-overview',
  templateUrl: './course-student-overview.component.html',
  styleUrls: ['./course-student-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, NzButtonModule, NzIconModule, NzProgressModule],
})
export class CourseStudentOverviewComponent {
  readonly course = input.required<Course>()
  readonly sections = input.required<CourseSection[]>()
  readonly activities = input.required<Activity[]>()

  protected readonly sectionItems = computed<SectionItems[]>(() =>
    this.sections()
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        section,
        activities: this.activities()
          .filter((activity) => activity.sectionId === section.id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }))
  )

  protected readonly hasStarted = computed(() => (this.course().statistic?.progression ?? 0) > 0)

  protected readonly firstIncompleteActivityId = computed<string | undefined>(() => {
    const flat = this.sectionItems().flatMap((item) => item.activities)
    return (flat.find((activity) => activity.progression < 100) ?? flat[0])?.id
  })
}
