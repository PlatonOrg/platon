import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

import { MatIconModule } from '@angular/material/icon'

import { NzGridModule } from 'ng-zorro-antd/grid'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { NzTableModule } from 'ng-zorro-antd/table'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'

import { UserAvatarComponent } from '@platon/core/browser'
import { AnswerStates, UserResults } from '@platon/feature/result/common'
import { DurationPipe, UiStatisticCardComponent } from '@platon/shared/ui'
import { AnswerStatePipesModule } from '../../pipes'

@Component({
  standalone: true,
  selector: 'result-by-members',
  templateUrl: './result-by-members.component.html',
  styleUrls: ['./result-by-members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,

    MatIconModule,

    NzGridModule,
    NzTableModule,
    NzToolTipModule,
    NzPopoverModule,

    DurationPipe,

    UserAvatarComponent,
    AnswerStatePipesModule,
    UiStatisticCardComponent,
  ],
})
export class ResultByMembersComponent implements OnInit {
  @Input({ required: true }) results: UserResults[] = []
  @Input() columnOrder?: string[] = []

  protected answerStates = Object.values(AnswerStates)
  private activityId: string | null = null
  private courseId: string | null = null

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.courseId = params.get('courseId')
      this.activityId = params.get('activityId')
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackByColumnOrder = (a: any, b: any): number => {
    const indexA = this.columnOrder?.indexOf(a.value.title)
    const indexB = this.columnOrder?.indexOf(b.value.title)
    if (indexA === undefined || indexB === undefined) {
      return 0
    }
    return indexA - indexB
  }

  protected openSession(sessionId: string | undefined): void {
    if (sessionId) {
      window.open(`/player/correction/${this.courseId}?activityId=${this.activityId}&sessionId=${sessionId}`)
    }
  }
}
