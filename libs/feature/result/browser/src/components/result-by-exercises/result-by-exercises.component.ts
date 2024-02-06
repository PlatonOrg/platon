import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { MatIconModule } from '@angular/material/icon'

import { NzGridModule } from 'ng-zorro-antd/grid'
import { NzTableModule } from 'ng-zorro-antd/table'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'

import { AnswerStates, ExerciseResults } from '@platon/feature/result/common'
import { DurationPipe, UiStatisticCardComponent } from '@platon/shared/ui'
import { AnswerStatePipesModule } from '../../pipes'

@Component({
  standalone: true,
  selector: 'result-by-exercises',
  templateUrl: './result-by-exercises.component.html',
  styleUrls: ['./result-by-exercises.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,

    MatIconModule,

    NzGridModule,
    NzTableModule,
    NzToolTipModule,

    DurationPipe,
    AnswerStatePipesModule,
    UiStatisticCardComponent,
  ],
})
export class ResultByExercisesComponent {
  @Input() results!: ExerciseResults[]

  protected expandSet = new Set<string>()
  protected answerStates = Object.values(AnswerStates).filter((state) => state !== AnswerStates.ANSWERED)

  protected onExpandChange(id: string, checked: boolean): void {
    if (checked) {
      this.expandSet.add(id)
    } else {
      this.expandSet.delete(id)
    }
  }
}
