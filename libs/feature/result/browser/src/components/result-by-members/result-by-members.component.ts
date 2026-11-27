import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core'
import { ActivatedRoute } from '@angular/router'

import { MatIconModule } from '@angular/material/icon'

import { NzGridModule } from 'ng-zorro-antd/grid'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { NzTableModule } from 'ng-zorro-antd/table'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

import { UserAvatarComponent } from '@platon/core/browser'
import { ActivityGroup, AnswerStates, UserResults } from '@platon/feature/result/common'
import { DurationPipe, UiStatisticCardComponent } from '@platon/shared/ui'
import { AnswerStatePipesModule } from '../../pipes'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { FormsModule } from '@angular/forms'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { fromEvent, filter } from 'rxjs'

@Component({
  selector: 'result-by-members',
  templateUrl: './result-by-members.component.html',
  styleUrls: ['./result-by-members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    NzGridModule,
    NzTableModule,
    NzTooltipModule,
    NzPopoverModule,
    DurationPipe,
    UserAvatarComponent,
    AnswerStatePipesModule,
    UiStatisticCardComponent,
    NzSelectModule,
    FormsModule,
  ],
})
export class ResultByMembersComponent implements OnInit {
  private route = inject(ActivatedRoute)

  @Input({ required: true }) results: UserResults[] = []
  @Input() columnOrder?: string[] = []

  protected answerStates = Object.values(AnswerStates)
  private activityId: string | null = null
  private courseId: string | null = null
  protected copyUrl = ''
  readonly open = signal(false)

  @Input() groups?: ActivityGroup[]
  readonly selectedGroup = signal<string[] | null>(null)

  readonly filteredResults = computed(() => {
    const selected = this.selectedGroup()
    const users = this.results
    if (!selected || selected.length === 0) {
      return users
    }
    return users.filter((user) => user.groupIds.some((id) => selected.includes(id)))
  })

  constructor() {
    // fix nz-select issue where the suggestion stay open when we scroll in the page.
    fromEvent(document, 'scroll', { capture: true, passive: true })
      .pipe(
        filter(() => this.open()),
        filter((e) => !(e.target instanceof Element && e.target.closest('.ant-select-dropdown'))),
        takeUntilDestroyed()
      )
      .subscribe(() => this.open.set(false))
  }

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

  protected buildSessionUrl(sessionId: string): string {
    if (!this.courseId || !this.activityId || !sessionId) {
      return '#'
    }
    return `/player/correction/${this.courseId}?activityId=${this.activityId}&sessionId=${sessionId}&mode=view`
  }
}
