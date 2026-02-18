import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
import Fuse from 'fuse.js'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker'
import { NzRadioModule } from 'ng-zorro-antd/radio'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzTagModule } from 'ng-zorro-antd/tag'

import { AuthService, DialogModule, DialogService, TagService } from '@platon/core/browser'
import { Level, Topic, User, uniquifyBy } from '@platon/core/common'
import {
  CourseMemberSelectComponent,
  CourseSearchBarComponent,
  CourseSectionSearchBarComponent,
  CourseService,
  CourseGroupSelectComponent,
} from '@platon/feature/course/browser'
import { Course, CourseGroup, CourseMember, CourseSection } from '@platon/feature/course/common'
import {
  ResourceFiltersComponent,
  ResourceService,
  ResourceTypeFilterIndicator,
  ResourceStatusFilterIndicator,
  ResourceOrderingFilterIndicator,
  ResourceDependOnFilterIndicator,
  ExerciseConfigurableFilterIndicator,
  TopicFilterIndicator,
  LevelFilterIndicator,
  CircleFilterIndicator,
  OwnerFilterIndicator,
} from '@platon/feature/resource/browser'
import {
  CircleTree,
  Resource,
  ResourceFilters,
  ResourceTypes,
  ResourceStatus,
  ResourceOrderings,
  ResourceExpandableFields,
  flattenCircleTree,
} from '@platon/feature/resource/common'
import {
  SearchBar,
  UiSearchBarComponent,
  UiStepDirective,
  UiStepperComponent,
  FilterIndicator,
  PeriodFilterMatcher,
  UiFilterIndicatorComponent,
} from '@platon/shared/ui'
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header'
import { catchError, firstValueFrom, of, map, shareReplay, Subscription } from 'rxjs'
import { ActivityListComponent } from './activity-list/activity-list.component'
import { ViewportIntersectionDirective } from '@cisstech/nge/directives'
import { HttpErrorResponse } from '@angular/common/http'

const PAGINATION_LIMIT = 15
const EXPANDS: ResourceExpandableFields[] = ['metadata', 'statistic']

@Component({
  standalone: true,
  selector: 'app-activity-create',
  templateUrl: './create.page.html',
  styleUrls: ['./create.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.meta.enter)': 'handleKeyDown()',
  },
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,

    MatIconModule,
    MatButtonModule,

    NzSpinModule,
    NzRadioModule,
    NzButtonModule,
    NzSelectModule,
    NzSkeletonModule,
    NzDatePickerModule,
    NzPageHeaderModule,
    NzTagModule,

    DialogModule,
    UiStepDirective,
    UiStepperComponent,
    UiSearchBarComponent,

    CourseSearchBarComponent,
    CourseMemberSelectComponent,
    CourseSectionSearchBarComponent,

    ResourceFiltersComponent,
    ActivityListComponent,
    UiFilterIndicatorComponent,
    ViewportIntersectionDirective,

    CourseGroupSelectComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ActivityCreatePage implements OnInit, OnDestroy {
  private readonly subscriptions: Subscription[] = []
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly courseService = inject(CourseService)
  private readonly dialogService = inject(DialogService)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly tagService = inject(TagService)
  private readonly resourceService = inject(ResourceService)

  protected user!: User
  protected loading = false
  protected creating = false
  protected challenge = false
  protected members: CourseMember[] = []
  protected courseGroups: CourseGroup[] = []
  protected hasFirstStep = true
  protected isTest = false

  protected readonly tree = signal<CircleTree>(undefined as unknown as CircleTree)
  protected readonly circles = signal<CircleTree[]>([])
  protected readonly topics = signal<Topic[]>([])
  protected readonly levels = signal<Level[]>([])
  protected readonly owners = signal<User[]>([])

  protected readonly resourceFilters = signal<ResourceFilters>({
    types: ['ACTIVITY'],
  })

  protected readonly items = signal<Resource[]>([])
  protected readonly totalMatches = signal(0)
  protected readonly searching = signal(true)
  protected readonly paginating = signal(false)
  protected readonly hasMore = signal(true)

  protected readonly completion = this.resourceService.completion().pipe(shareReplay(1))

  protected readonly filterIndicators = signal<FilterIndicator<ResourceFilters>[]>([])
  protected readonly showScrollButton = signal(true)

  protected readonly activitySearchBar: SearchBar<string> = {
    placeholder: 'Essayez un nom, un topic, un niveau...',
    filterer: {
      run: (query) => {
        return this.completion.pipe(
          map((completion) => {
            const suggestions = new Set<string>([
              query,
              ...completion.names,
              ...completion.topics,
              ...completion.levels,
            ])
            return new Fuse(Array.from(suggestions), {
              includeMatches: true,
              findAllMatches: false,
              threshold: 0.4,
            })
              .search(query)
              .map((e) => e.item)
          })
        )
      },
    },
    onSearch: (query) => this.search(this.resourceFilters(), query),
    onFilter: () => {
      this.openFilters()
    },
  }

  @ViewChild(UiStepperComponent)
  protected stepper!: UiStepperComponent

  @ViewChild(ResourceFiltersComponent)
  protected filtersComponent!: ResourceFiltersComponent

  @ViewChild('activitySection')
  protected activitySection?: ElementRef<HTMLElement>

  protected async handleKeyDown() {
    if (this.stepper.isValid) {
      this.stepper.isLast ? await this.create() : this.stepper.nextStep()
    }
  }

  protected courseInfo = new FormGroup({
    course: new FormControl<Course | undefined>(undefined, [Validators.required]),
    section: new FormControl<CourseSection | undefined>(undefined, [Validators.required]),
  })

  protected resourceInfo = new FormGroup({
    resources: new FormControl<Resource[]>([], [Validators.required, Validators.minLength(1)]),
  })

  protected settingsInfo = new FormGroup({
    members: new FormControl<string[] | undefined>(undefined),
    openAt: new FormControl<Date | undefined>(undefined),
    closeAt: new FormControl<Date | undefined>(undefined),
    correctors: new FormControl<string[] | undefined>(undefined),
    groups: new FormControl<string[] | undefined>(undefined),
    isChallenge: new FormControl<boolean>(false),
  })

  protected disabledDate = (current: Date): boolean => differenceInCalendarDays(current, new Date()) < 0

  async ngOnInit(): Promise<void> {
    this.loading = true

    this.user = (await this.authService.ready()) as User

    const [tree, topics, levels, owners] = await Promise.all([
      firstValueFrom(this.resourceService.tree()),
      firstValueFrom(this.tagService.listTopics()),
      firstValueFrom(this.tagService.listLevels()),
      firstValueFrom(this.resourceService.listOwners()),
    ])

    this.tree.set(tree)
    this.topics.set(topics)
    this.levels.set(levels)
    this.owners.set(owners)

    this.filterIndicators.set([
      ...topics.map(TopicFilterIndicator),
      ...levels.map(LevelFilterIndicator),
      ...this.circles().map((circle) => CircleFilterIndicator(circle)),
      ...owners.map(OwnerFilterIndicator),
      ...Object.values(ResourceTypes).map(ResourceTypeFilterIndicator),
      ...Object.values(ResourceStatus).map(ResourceStatusFilterIndicator),
      ...Object.values(ResourceOrderings).map(ResourceOrderingFilterIndicator),
      //ResourceDependOnFilterIndicator(),
      ExerciseConfigurableFilterIndicator,
      PeriodFilterMatcher,
    ])
    if (tree) {
      this.circles.set(flattenCircleTree(tree))
      this.filterIndicators.set([
        ...flattenCircleTree(tree).map((circle) => CircleFilterIndicator(circle)),
        ...this.filterIndicators(),
      ])
    }

    const { queryParamMap } = this.activatedRoute.snapshot

    const courseId = queryParamMap.get('course')
    const sectionId = queryParamMap.get('section')
    this.isTest = queryParamMap.get('isTest') === '1'
    if (sectionId) {
      this.hasFirstStep = false
    }
    this.challenge = !!queryParamMap.get('challenge')
    if (this.challenge) {
      this.settingsInfo.get('isChallenge')?.setValue(true)
    }

    const course = courseId
      ? await firstValueFrom(
          this.courseService
            .find({
              id: courseId,
            })
            .pipe(catchError(() => of(undefined)))
        )
      : undefined

    const section =
      courseId && sectionId
        ? await firstValueFrom(
            this.courseService.findSection(courseId, sectionId).pipe(catchError(() => of(undefined)))
          )
        : undefined

    this.courseInfo.patchValue({ course, section })

    if (course && section) {
      this.courseInfo.disable()
    }

    this.loading = false

    await this.search(this.resourceFilters(), '')

    this.changeDetectorRef.markForCheck()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected openFilters(): void {
    this.filtersComponent.open()
  }

  protected search(filters: ResourceFilters, query?: string): void {
    this.resourceFilters.set({
      ...filters,
      search: query,
      types: ['ACTIVITY'],
    })

    this.searching.set(true)
    this.items.set([])
    this.hasMore.set(true)
    this.paginating.set(false)

    firstValueFrom(
      this.resourceService.search({
        ...this.resourceFilters(),
        expands: EXPANDS,
        limit: PAGINATION_LIMIT,
      })
    )
      .then((response) => {
        this.items.set(response.resources)
        this.hasMore.set(response.resources.length > 0)
        this.totalMatches.set(response.total)
        this.searching.set(false)
        this.changeDetectorRef.markForCheck()
      })
      .catch((error) => {
        console.error("Erreur lors de la recherche d'activités", error)
        this.searching.set(false)
        this.changeDetectorRef.markForCheck()
      })
  }

  protected async loadMore(): Promise<void> {
    if (this.paginating()) {
      return
    }

    this.paginating.set(true)
    const response = await firstValueFrom(
      this.resourceService.search({
        ...this.resourceFilters(),
        expands: EXPANDS,
        limit: PAGINATION_LIMIT,
        offset: this.items().length,
      })
    )

    const length = this.items().length
    this.items.set(uniquifyBy([...this.items(), ...response.resources], 'id'))
    this.hasMore.set(this.items().length > length)
    this.paginating.set(false)

    this.changeDetectorRef.markForCheck()
  }

  protected async onFiltersApplied(filters: ResourceFilters): Promise<void> {
    this.search(filters, this.activitySearchBar.value)
  }

  protected get getSelectedResourceIds(): string[] {
    return this.resourceInfo.value.resources?.map((r) => r.id) || []
  }

  protected selectActivity(activity: Resource): void {
    const currentResources = this.resourceInfo.value.resources || []
    const index = currentResources.findIndex((r) => r.id === activity.id)

    let updatedResources: Resource[]
    if (index > -1) {
      updatedResources = currentResources.filter((_, i) => i !== index)
    } else {
      updatedResources = [...currentResources, activity]
    }

    this.resourceInfo.patchValue({ resources: updatedResources })
    this.changeDetectorRef.markForCheck()
  }

  protected onScroll(event: Event): void {
    const section = event.target as HTMLElement
    this.showScrollButton.set(section.scrollTop > 10)
  }

  protected scrollToTop(): void {
    const section = this.activitySection?.nativeElement
    if (!section) {
      console.warn('Section introuvable pour le scroll')
      return
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
  }

  protected deselectActivity(): void {
    this.resourceInfo.patchValue({ resources: [] })
    this.changeDetectorRef.markForCheck()
  }

  protected async create(): Promise<void> {
    try {
      this.creating = true
      const { course, section } = this.courseInfo.value
      const { resources } = this.resourceInfo.value
      const { openAt, closeAt, members, correctors, groups, isChallenge } = this.settingsInfo.value

      const createdActivities = await firstValueFrom(
        this.courseService.createActivities(
          course as Course,
          (resources || []).map((resource) => ({
            sectionId: section?.id as string,
            resourceId: resource.id,
            resourceVersion: 'latest',
            openAt: openAt as Date,
            closeAt: closeAt as Date,
            isChallenge: !!isChallenge,
          }))
        )
      )

      if (this.isTest) {
        await this.router.navigateByUrl(`/tests/${course?.id}`, { replaceUrl: true })
      } else {
        await this.router.navigateByUrl(`/courses/${course?.id}`, { replaceUrl: true })
      }
    } catch (error) {
      let errorMessage = 'Une erreur inconnue est survenue'

      if (error && typeof error === 'object' && 'error' in error) {
        const httpError = error as HttpErrorResponse
        errorMessage = httpError.error?.message || httpError.message || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      } else {
        errorMessage = String(error || errorMessage)
      }

      this.dialogService.error(
        'Une erreur est survenue lors de la création des activités, veuillez réessayer un peu plus tard !'
      )
      this.dialogService.error(`${errorMessage}`)
    } finally {
      this.creating = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async loadMembers(): Promise<void> {
    const { course } = this.courseInfo.value
    if (course) {
      const membersResponse = await firstValueFrom(this.courseService.searchMembers(course))
      this.members = membersResponse.resources
      const groupsResponse = await firstValueFrom(this.courseService.listGroups(course.id))
      this.courseGroups = groupsResponse.resources
      this.changeDetectorRef.markForCheck()
    }
  }
}
