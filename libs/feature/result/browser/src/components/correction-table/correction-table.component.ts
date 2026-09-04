import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTableModule } from 'ng-zorro-antd/table'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { NzCollapseModule } from 'ng-zorro-antd/collapse'
import { MatIconModule } from '@angular/material/icon'

import { RouterModule } from '@angular/router'
import { ActivityCorrectionSummary } from '@platon/feature/result/common'
import { antTagColorFromPercentage } from '@platon/shared/ui'

type Item = ActivityCorrectionSummary & {
  correctionStatusColor: string
}

@Component({
  selector: 'correction-table',
  templateUrl: './correction-table.component.html',
  styleUrls: ['./correction-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    NzTagModule,
    NzIconModule,
    NzTableModule,
    NzButtonModule,
    NzTooltipModule,
    NzCollapseModule,
    MatIconModule,
  ],
})
export class CorrectionTableComponent {
  private _groupedCourses: { courseName: string; activities: Item[] }[] = []

  @Input()
  set corrections(value: ActivityCorrectionSummary[]) {
    this._groupedCourses = this.groupCorrections(value)
  }

  get groupedCourses() {
    return this._groupedCourses
  }

  private groupCorrections(corrections: ActivityCorrectionSummary[]) {
    const courseMap = new Map<string, { courseName: string; activities: Item[] }>()

    corrections.forEach((correction) => {
      const courseName = correction.courseName ?? 'Cours Inconnu'
      const activity: Item = {
        ...correction,
        correctionStatusColor: antTagColorFromPercentage(
          correction.totalExercises > 0
            ? Math.round((correction.correctedExercises / correction.totalExercises) * 100)
            : 0
        ),
      }

      if (!courseMap.has(courseName)) {
        courseMap.set(courseName, { courseName, activities: [] })
      }
      courseMap.get(courseName)?.activities.push(activity)
    })

    return Array.from(courseMap.values())
  }
}
