import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { RouterModule } from '@angular/router'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzProgressModule } from 'ng-zorro-antd/progress'

import { Activity, Course, CourseSection, isGradedActivity } from '@platon/feature/course/common'
import { DurationPipe } from '@platon/shared/ui'
import { buildGradedActivities } from '../../utils/graded-activities.util'
import { CoursePipesModule } from '../../pipes'

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
  imports: [
    CommonModule,
    RouterModule,
    NzButtonModule,
    NzIconModule,
    NzProgressModule,
    DurationPipe,
    CoursePipesModule,
  ],
})
export class CourseStudentOverviewComponent {
  readonly course = input.required<Course>()
  readonly sections = input.required<CourseSection[]>()
  readonly activities = input.required<Activity[]>()

  private readonly sortedSections = computed(() =>
    this.sections()
      .slice()
      .sort((a, b) => a.order - b.order)
  )

  // Les TP notés (cf. `isGradedActivity`) sortent du parcours de lecture séquentiel : ils ne
  // figurent ni dans la table des matières ni dans la progression du cours (voir `gradedActivities`).
  protected readonly sectionItems = computed<SectionItems[]>(() =>
    this.sortedSections().map((section) => ({
      section,
      activities: this.activities()
        .filter((activity) => activity.sectionId === section.id && !isGradedActivity(activity))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
  )

  protected readonly gradedActivities = computed(() => buildGradedActivities(this.sections(), this.activities()))

  protected readonly hasStarted = computed(() => (this.course().statistic?.progression ?? 0) > 0)

  protected readonly firstIncompleteActivityId = computed<string | undefined>(() => {
    const flat = this.sectionItems().flatMap((item) => item.activities)
    return (flat.find((activity) => activity.progression < 100) ?? flat[0])?.id
  })
}
