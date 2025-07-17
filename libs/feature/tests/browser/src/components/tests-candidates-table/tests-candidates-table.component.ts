/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core'
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms'
import { NzTableColumn, UserAvatarComponent, UserGroupDrawerComponent } from '@platon/core/browser'
import { CourseMember, CourseMemberFilters } from '@platon/feature/course/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table'
import { CoursePipesModule } from '@platon/feature/course/browser'
import { MatIconModule } from '@angular/material/icon'
import { TestsService } from '../../api/tests.service'
import { firstValueFrom } from 'rxjs'

type Value = string[] | undefined

type overtime = 'none' | 'quarter' | 'third' | 'half'

@Component({
  standalone: true,
  selector: 'tests-candidates-table',
  templateUrl: './tests-candidates-table.component.html',
  styleUrls: ['./tests-candidates-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TestsCandidatesTableComponent),
      multi: true,
    },
  ],
  imports: [
    CommonModule,

    NzIconModule,
    NzTableModule,
    NzButtonModule,
    NzPopconfirmModule,
    FormsModule,

    UserAvatarComponent,
    UserGroupDrawerComponent,
    CoursePipesModule,

    MatIconModule,
  ],
})
export class TestsCandidatesTableComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() members: CourseMember[] = []
  @Input() editable = false

  @Output() deleted = new EventEmitter<CourseMember>()

  @Input() total = 0
  @Input() loading = false

  @Input() filters: CourseMemberFilters = {}
  @Output() filtersChange = new EventEmitter<CourseMemberFilters>()

  @Input() testId = ''

  protected checked = false
  protected disabled = false
  protected indeterminate = false
  protected selection = new Set<string>()

  protected columns: NzTableColumn<CourseMember>[] = []

  // protected TMPovertimeTable: { [key: string]: overtime } = {}

  protected get canFilterOnServer(): boolean {
    return this.filtersChange.observed
  }

  constructor(private readonly changeDetectorRef: ChangeDetectorRef, private readonly testService: TestsService) {}

  // ControlValueAccessor methods

  onTouch: any = () => {
    //
  }
  onChange: any = () => {
    //
  }

  writeValue(value: Value): void {
    this.selection = new Set(value || [])
    this.changeDetectorRef.markForCheck()
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
  }

  ngOnInit(): void {
    this.columns = [
      {
        key: 'name',
        name: 'Utilisateur',
        sortOrder: 'ascend',
        sortFn: !this.canFilterOnServer
          ? (a: CourseMember, b: CourseMember) => {
              const aLast = a.user?.lastName || ''
              const bLast = b.user?.lastName || ''
              if (aLast !== bLast) {
                return aLast.localeCompare(bLast)
              }
              const aFirst = a.user?.firstName || ''
              const bFirst = b.user?.firstName || ''
              if (aFirst !== bFirst) {
                return aFirst.localeCompare(bFirst)
              }
              const aUsername = a.user?.username || ''
              const bUsername = b.user?.username || ''
              return aUsername.localeCompare(bUsername)
            }
          : true,
      },
      {
        key: 'email',
        name: 'Email',
        sortFn: !this.canFilterOnServer
          ? (a: CourseMember, b: CourseMember) => {
              const aEmail = a.user?.email || ''
              const bEmail = b.user?.email || ''
              return aEmail.localeCompare(bEmail)
            }
          : true,
      },
      {
        key: 'createdAt',
        name: `Date d'ajout`,
        sortFn: !this.canFilterOnServer
          ? (a: CourseMember, b: CourseMember) => {
              return a.createdAt.valueOf() - b.createdAt.valueOf()
            }
          : true,
      },
      // {
      //   key: 'extraTime',
      //   name: 'Temps supplémentaire',
      //   sortFn: !this.canFilterOnServer ? true : true,
      // },
      {
        key: 'status',
        name: 'Statut',
        sortFn: !this.canFilterOnServer ? true : true,
      },
    ]
  }

  ngOnChanges() {
    this.total = this.total || this.members.length

    // this.members.forEach((member) => {
    //   const random = Math.floor(Math.random() * 4)
    //   this.TMPovertimeTable[member.id] =
    //     random === 0 ? 'none' : random === 1 ? 'quarter' : random === 2 ? 'third' : 'half'
    // })
  }

  protected updateSelection(id: string, checked: boolean): void {
    if (checked) {
      this.selection.add(id)
    } else {
      this.selection.delete(id)
    }
  }

  protected refreshSelection(): void {
    this.checked = this.members.every(({ id }) => this.selection.has(id))
    this.indeterminate = this.members.some(({ id }) => this.selection.has(id)) && !this.checked

    const selection = Array.from(this.selection)
    this.onTouch(selection)
    this.onChange(selection)
    this.changeDetectorRef.markForCheck()
  }

  protected onItemChecked(id: string, checked: boolean): void {
    this.updateSelection(id, checked)
    this.refreshSelection()
  }

  protected onAllChecked(checked: boolean): void {
    this.members.forEach(({ id }) => this.updateSelection(id, checked))
    this.refreshSelection()
  }

  protected onChangeFilter(filters: CourseMemberFilters): void {
    this.filtersChange.next({ ...this.filters, ...filters })
  }

  protected onQueryParamsChange(params: NzTableQueryParams): void {
    if (!this.canFilterOnServer) return

    const { pageSize, pageIndex, sort } = params
    const currentSort = sort.find((item) => item.value !== null)

    const order = (currentSort && currentSort.key) || 'name'
    const direction = (currentSort && currentSort.value) || 'ascend'

    this.onChangeFilter({
      order: {
        name: 'NAME' as const,
        createdAt: 'CREATED_AT' as const,
      }[order],
      direction: {
        ascend: 'ASC' as const,
        descend: 'DESC' as const,
      }[direction],

      limit: pageSize,
      offset: pageSize * (pageIndex - 1),
    })
  }

  protected async sendMailToCandidate(courseMemberId: string): Promise<void> {
    try {
      await firstValueFrom(this.testService.sendMailToCandidate(this.testId, courseMemberId))
    } catch (error) {
      console.error('Failed to send email:', error)
    }
  }
}
