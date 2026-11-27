import { ChangeDetectionStrategy, Component } from '@angular/core'

import { MatIconModule } from '@angular/material/icon'

import { NzListModule } from 'ng-zorro-antd/list'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

import { AnswerStates } from '@platon/feature/result/common'
import { AnswerStatePipesModule } from '../../pipes'

@Component({
  selector: 'result-legend',
  templateUrl: './result-legend.component.html',
  styleUrls: ['./result-legend.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, NzListModule, NzTooltipModule, AnswerStatePipesModule],
})
export class ResultLegendComponent {
  protected answerStates = Object.values(AnswerStates)
}
