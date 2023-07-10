import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import Fuse from 'fuse.js'
import { firstValueFrom, map, shareReplay, Subscription } from 'rxjs'

import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { NzSpinModule } from 'ng-zorro-antd/spin'

import {
  FilterIndicator,
  FilterMatcher,
  matchIndicators,
  PeriodFilterMatcher,
  SearchBar,
  UiFilterIndicatorComponent,
  UiSearchBarComponent,
} from '@platon/shared/ui'

import { AuthService } from '@platon/core/browser'
import { OrderingDirections, User } from '@platon/core/common'
import {
  CircleFilterMatcher,
  ResourceFiltersComponent,
  ResourceItemComponent,
  ResourceListComponent,
  ResourceOrderingFilterMatcher,
  ResourcePipesModule,
  ResourceService,
  ResourceStatusFilterMatcher,
  ResourceTypeFilterMatcher,
} from '@platon/feature/resource/browser'
import {
  CircleTree,
  flattenCircleTree,
  Resource,
  ResourceFilters,
  ResourceOrderings,
  ResourceStatus,
  ResourceTypes,
} from '@platon/feature/resource/common'

@Component({
  standalone: true,
  selector: 'app-resources',
  templateUrl: 'resources.page.html',
  styleUrls: ['resources.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,

    MatCardModule,
    MatIconModule,

    NzSpinModule,
    NzIconModule,
    NzButtonModule,
    NzPopoverModule,

    ResourcePipesModule,
    ResourceItemComponent,
    ResourceListComponent,
    ResourceFiltersComponent,

    UiSearchBarComponent,
    UiFilterIndicatorComponent,
  ],
})
export default class ResourcesPage implements OnInit, OnDestroy {
  private readonly subscriptions: Subscription[] = []
  private readonly filterMatchers: FilterMatcher<ResourceFilters>[] = [
    ...Object.values(ResourceTypes).map(ResourceTypeFilterMatcher),
    ...Object.values(ResourceStatus).map(ResourceStatusFilterMatcher),
    ...Object.values(ResourceOrderings).map(ResourceOrderingFilterMatcher),
    PeriodFilterMatcher,
    CircleFilterMatcher(() => this.tree),
  ]

  protected readonly searchbar: SearchBar<string> = {
    placeholder: 'Essayez un nom, un topic, un niveau...',
    filterer: {
      run: (query) => {
        return this.completion.pipe(
          map((completion) => {
            const suggestions = new Set<string>([
              ...completion.names,
              ...completion.topics,
              ...completion.levels,
            ])
            return new Fuse(Array.from(suggestions), {
              includeMatches: true,
              findAllMatches: false,
              threshold: 0.2,
            })
              .search(query)
              .map((e) => e.item)
          })
        )
      },
    },
    onSearch: (query) => this.search(this.filters, query),
  }

  private user?: User

  protected tree?: CircleTree
  protected circles: CircleTree[] = []

  protected indicators: FilterIndicator<ResourceFilters>[] = []
  protected completion = this.resourceService.completion().pipe(shareReplay(1))

  protected searching = true
  protected filters: ResourceFilters = {}
  protected circle!: Resource
  protected items: Resource[] = []
  protected views: Resource[] = []
  protected recents: Resource[] = []

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly resourceService: ResourceService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.user = (await this.authService.ready()) as User

    const [tree, circle, views, recents] = await Promise.all([
      firstValueFrom(this.resourceService.tree()),
      firstValueFrom(this.resourceService.circle(this.user.username)),
      firstValueFrom(this.resourceService.search({ views: true })),
      firstValueFrom(
        this.resourceService.search({
          period: 7,
          limit: 5,
          order: ResourceOrderings.UPDATED_AT,
          direction: OrderingDirections.DESC,
        })
      ),
    ])

    this.tree = tree
    this.circle = circle
    this.views = views.resources
    this.recents = recents.resources

    this.circles = []
    if (this.tree) {
      this.circles = flattenCircleTree(this.tree)
    }
    this.changeDetectorRef.markForCheck()

    this.subscriptions.push(
      this.activatedRoute.queryParams.subscribe(async (e: QueryParams) => {
        this.filters = {
          ...this.filters,
          search: e.q,
          parent: e.parent,
          period: Number.parseInt(e.period + '', 10) || this.filters.period || 0,
          order: e.order,
          direction: e.direction,
          types: typeof e.types === 'string' ? [e.types] : e.types,
          status: typeof e.status === 'string' ? [e.status] : e.status,
        }

        if (this.searchbar.value !== e.q) {
          this.searchbar.value = e.q
        }

        this.searching = true
        this.items = (await firstValueFrom(this.resourceService.search(this.filters))).resources
        this.searching = false

        this.indicators = matchIndicators(this.filters, this.filterMatchers, (data) =>
          this.search(data, data.search)
        )

        this.changeDetectorRef.markForCheck()
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected search(filters: ResourceFilters, query?: string) {
    const queryParams: QueryParams = {
      q: query,
      period: filters.period,
      order: filters.order,
      direction: filters.direction,
      types: filters.types,
      status: filters.status,
      parent: filters.parent,
    }

    this.router.navigate([], {
      queryParams,
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
    })
  }
}

interface QueryParams {
  q?: string
  period?: string | number
  order?: ResourceOrderings
  direction?: OrderingDirections
  types?: keyof typeof ResourceTypes | (keyof typeof ResourceTypes)[]
  status?: keyof typeof ResourceStatus | (keyof typeof ResourceStatus)[]
  parent?: string
}
