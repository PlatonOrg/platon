import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTableModule } from 'ng-zorro-antd/table'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { NzCollapseModule } from 'ng-zorro-antd/collapse'
import { MatIconModule } from '@angular/material/icon'

import { RouterModule } from '@angular/router'
import { ActivityCorrection } from '@platon/feature/result/common'
import { antTagColorFromPercentage } from '@platon/shared/ui'

type Item = ActivityCorrection & {
  exerciseCount: number
  correctedCount: number
  correctionStatusColor: string
}

@Component({
  standalone: true,
  selector: 'correction-table',
  templateUrl: './correction-table.component.html',
  styleUrls: ['./correction-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NzTagModule,
    NzIconModule,
    NzTableModule,
    NzButtonModule,
    NzToolTipModule,
    NzCollapseModule,
    MatIconModule,
  ],
})
export class CorrectionTableComponent {
  private _groupedCourses: { courseName: string; activities: Item[] }[] = []

  @Input()
  set corrections(value: ActivityCorrection[]) {
    this._groupedCourses = this.groupCorrections(value)
  }

  get groupedCourses() {
    return this._groupedCourses
  }

  private groupCorrections(corrections: ActivityCorrection[]) {
    const courseMap = new Map<string, { courseName: string; activities: Item[] }>()

    corrections.forEach((correction) => {
      const courseName = correction.courseName ?? 'Cours Inconnu'
      const correctedCount = correction.exercises.filter((e) => e.correctedAt).length
      const exerciseCount = correction.exercises.length

      const activity: Item = {
        ...correction,
        correctedCount,
        exerciseCount,
        correctionStatusColor: antTagColorFromPercentage(
          exerciseCount > 0 ? Math.round((correctedCount / exerciseCount) * 100) : 0
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
