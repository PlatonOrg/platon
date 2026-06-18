/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import Fuse from 'fuse.js'
import { Subscription, firstValueFrom, of, shareReplay } from 'rxjs'

import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzTabsModule } from 'ng-zorro-antd/tabs'

import {
  FilterIndicator,
  PeriodFilterMatcher,
  SearchBar,
  UiFilterIndicatorComponent,
  UiSearchBarComponent,
} from '@platon/shared/ui'

import { AuthService } from '@platon/core/browser'
import { OrderingDirections, User } from '@platon/core/common'
import {
  CourseFiltersComponent,
  CourseListComponent,
  CourseOrderingFilterIndicator,
  CoursePipesModule,
  CourseService,
} from '@platon/feature/course/browser'
import { Course, CourseFilters, CourseOrderings } from '@platon/feature/course/common'
import { UserRoles } from '@platon/core/common'
import { CourseManagementTutorialService } from '@platon/feature/tuto/browser'

type ActiveTab = 'current' | 'archived'

@Component({
  standalone: true,
  selector: 'app-courses',
  templateUrl: './courses.page.html',
  styleUrls: ['./courses.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,

    MatCardModule,
    MatIconModule,

    NzSpinModule,
    NzIconModule,
    NzButtonModule,
    NzTabsModule,

    CoursePipesModule,
    CourseListComponent,
    CourseFiltersComponent,

    UiSearchBarComponent,
    UiFilterIndicatorComponent,
  ],
})
export class CoursesPage implements OnInit, OnDestroy {
  private readonly subscriptions: Subscription[] = []
  protected readonly indicators: FilterIndicator<CourseFilters>[] = [
    ...Object.values(CourseOrderings).map(CourseOrderingFilterIndicator),
    PeriodFilterMatcher,
  ]

  protected readonly searchbar: SearchBar<string> = {
    placeholder: 'Essayez un nom...',
    filterer: {
      run: (query) => {
        const suggestions = new Set<string>(this.items.map((e) => e.name))
        return of(
          new Fuse(Array.from(suggestions), {
            includeMatches: true,
            findAllMatches: false,
            threshold: 0.4,
          })
            .search(query)
            .map((e) => e.item)
        )
      },
    },
    onSearch: (query) => this.search(this.filters, query),
  }

  private user?: User
  protected canCreateCourse = false
  protected activeTab: ActiveTab = 'current'

  protected completion = of([]).pipe(
    // TODO implements server function
    shareReplay(1)
  )

  protected searching = true
  protected archiving = false
  protected filters: CourseFilters = {}
  protected items: Course[] = []
  protected totalMatches = 0
  protected displayShowAllButton = false

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly courseService: CourseService,
    private readonly courseManagementTutorialService: CourseManagementTutorialService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.user = (await this.authService.ready()) as User
    this.displayShowAllButton = this.user?.role === UserRoles.admin
    this.canCreateCourse = this.user?.role === UserRoles.teacher || this.user?.role === UserRoles.admin
    this.changeDetectorRef.markForCheck()
    const order = localStorage.getItem('course-order') as CourseOrderings
    const direction = localStorage.getItem('course-direction') as OrderingDirections
    if (order && direction) {
      this.filters = {
        ...this.filters,
        order,
        direction,
      }
      await this.router.navigate([], { queryParams: { order, direction }, relativeTo: this.activatedRoute })
    }

    this.subscriptions.push(
      this.activatedRoute.queryParams.subscribe(async (e: QueryParams) => {
        if (e.order && e.direction) {
          localStorage.setItem('course-order', e.order)
          localStorage.setItem('course-direction', e.direction)
        }
        this.filters = {
          ...this.filters,
          search: e.q,
          period: Number.parseInt(e.period + '', 10) || 0,
          order: e.order,
          direction: e.direction,
        }

        if (this.searchbar.value !== e.q) {
          this.searchbar.value = e.q
        }

        await this.loadCourses()

        this.checkForCourseTutorial()

        this.changeDetectorRef.markForCheck()
      })
    )
  }

  async searchAll() {
    this.filters = {
      ...this.filters,
      showAll: true,
    }

    this.searching = true
    const response = await firstValueFrom(
      this.courseService.search({
        ...this.filters,
        expands: ['permissions', 'statistic'],
      })
    )
    this.items = response.resources
    this.totalMatches = response.total
    this.searching = false
    this.displayShowAllButton = false

    this.changeDetectorRef.markForCheck()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected search(filters: CourseFilters, query?: string) {
    const queryParams: QueryParams = {
      q: query,
      period: filters.period,
      order: filters.order,
      direction: filters.direction,
    }

    this.router
      .navigate([], {
        queryParams,
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge',
      })
      .catch(console.error)
  }

  protected async onTabChange(tab: ActiveTab): Promise<void> {
    this.activeTab = tab
    await this.loadCourses()
    this.changeDetectorRef.markForCheck()
  }

  protected async onArchiveToggle(course: Course): Promise<void> {
    if (this.archiving) return
    this.archiving = true
    const shouldArchive = this.activeTab === 'current'
    try {
      await firstValueFrom(this.courseService.archiveMember(course.id, shouldArchive))
      await this.loadCourses()
    } finally {
      this.archiving = false
      this.changeDetectorRef.markForCheck()
    }
  }

  private async loadCourses(): Promise<void> {
    this.searching = true
    this.changeDetectorRef.markForCheck()
    const archived = this.activeTab === 'archived' ? true : false
    const response = await firstValueFrom(
      this.courseService.search({
        ...this.filters,
        archived,
        expands: ['permissions', 'statistic'],
      })
    )
    this.items = response.resources
    this.totalMatches = response.total
    this.searching = false
  }

  private checkForCourseTutorial(): void {
    this.subscriptions.push(
      this.activatedRoute.queryParams.subscribe((params: any) => {
        if (params['tutorial'] === 'course-management' && this.user) {
          this.resetTutorialParam()

          setTimeout(() => {
            this.startCourseManagementTutorial()
          }, 500)
        }
      })
    )
  }

  private resetTutorialParam(): void {
    this.router
      .navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { tutorial: null },
        queryParamsHandling: 'merge',
      })
      .catch(console.error)
  }

  private startCourseManagementTutorial(): void {
    if (!this.user || (this.user.role !== UserRoles.admin && this.user.role !== UserRoles.teacher)) return
    this.courseManagementTutorialService.startCourseManagementTutorial(this.user, this.items)
  }

  protected showArchiveButtonIfNotAdmin(): boolean {
    return this.user?.role !== UserRoles.admin
  }
}

interface QueryParams {
  q?: string
  period?: string | number
  order?: CourseOrderings
  direction?: OrderingDirections
}
