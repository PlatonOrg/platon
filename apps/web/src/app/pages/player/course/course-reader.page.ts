import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzProgressModule } from 'ng-zorro-antd/progress'
import { NzSpinModule } from 'ng-zorro-antd/spin'

import { Activity, Course, CourseSection } from '@platon/feature/course/common'
import { CourseService } from '@platon/feature/course/browser'
import { EditorjsViewerComponent } from '@platon/shared/ui'
import { PlayerService, PlayerWrapperComponent } from '@platon/feature/player/browser'
import { ActivityPlayer } from '@platon/feature/player/common'

interface ReaderItem {
  readonly activity: Activity
  readonly sectionId: string
  readonly sectionName: string
}

@Component({
  standalone: true,
  selector: 'app-course-reader',
  templateUrl: './course-reader.page.html',
  styleUrls: ['./course-reader.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NzButtonModule,
    NzIconModule,
    NzProgressModule,
    NzSpinModule,
    EditorjsViewerComponent,
    PlayerWrapperComponent,
  ],
})
export class CourseReaderPage implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly courseService = inject(CourseService)
  private readonly playerService = inject(PlayerService)

  protected readonly loading = signal(true)
  protected readonly course = signal<Course | undefined>(undefined)
  protected readonly sections = signal<CourseSection[]>([])
  protected readonly items = signal<ReaderItem[]>([])
  protected readonly currentIndex = signal(0)
  protected readonly embeddedActivityPlayer = signal<ActivityPlayer | undefined>(undefined)
  protected readonly startingActivity = signal(false)
  protected readonly sidebarOpen = signal(true)

  protected readonly currentItem = computed<ReaderItem | undefined>(() => this.items()[this.currentIndex()])
  protected readonly hasPrevious = computed(() => this.currentIndex() > 0)
  protected readonly hasNext = computed(() => this.currentIndex() < this.items().length - 1)

  async ngOnInit(): Promise<void> {
    const courseId = this.route.snapshot.paramMap.get('courseId') as string
    const course = await firstValueFrom(this.courseService.find({ id: courseId, expands: ['statistic'] }))
    this.course.set(course)

    const [sectionsResponse, activitiesResponse] = await Promise.all([
      firstValueFrom(this.courseService.listSections(course)),
      firstValueFrom(this.courseService.listActivities(course)),
    ])

    const sections = [...sectionsResponse.resources].sort((a, b) => a.order - b.order)
    this.sections.set(sections)

    const items: ReaderItem[] = []
    for (const section of sections) {
      const sectionActivities = activitiesResponse.resources
        .filter((activity) => activity.sectionId === section.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      for (const activity of sectionActivities) {
        items.push({ activity, sectionId: section.id, sectionName: section.name })
      }
    }
    this.items.set(items)

    const requestedItemId = this.route.snapshot.queryParamMap.get('item')
    const requestedIndex = requestedItemId ? items.findIndex((item) => item.activity.id === requestedItemId) : -1
    const firstIncompleteIndex = items.findIndex((item) => item.activity.progression < 100)
    this.currentIndex.set(requestedIndex >= 0 ? requestedIndex : firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0)

    this.loading.set(false)
  }

  protected itemsForSection(sectionId: string): ReaderItem[] {
    return this.items().filter((item) => item.sectionId === sectionId)
  }

  protected goToIndex(index: number): void {
    if (index < 0 || index >= this.items().length) {
      return
    }
    this.currentIndex.set(index)
    this.embeddedActivityPlayer.set(undefined)
    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { item: this.items()[index].activity.id },
        queryParamsHandling: 'merge',
      })
      .catch(console.error)
  }

  protected async next(): Promise<void> {
    await this.markCurrentLessonCompleted()
    this.goToIndex(this.currentIndex() + 1)
  }

  protected previous(): void {
    this.goToIndex(this.currentIndex() - 1)
  }

  // Bouton explicite en plus du marquage automatique au clic "suivant" : sans lui,
  // le tout dernier item du cours (pas de "suivant" à cliquer dessus) ne pourrait jamais être marqué lu.
  protected async markCurrentLessonCompleted(): Promise<void> {
    const item = this.currentItem()
    if (!item || item.activity.kind !== 'lesson' || item.activity.progression === 100) {
      return
    }
    await firstValueFrom(this.courseService.markLessonCompleted(item.activity))
    this.items.update((items) =>
      items.map((existing) =>
        existing.activity.id === item.activity.id
          ? { ...existing, activity: { ...existing.activity, progression: 100 } }
          : existing
      )
    )
  }

  protected async startActivity(item: ReaderItem): Promise<void> {
    if (this.startingActivity()) {
      return
    }

    this.startingActivity.set(true)
    try {
      const output = await firstValueFrom(this.playerService.playActivity({ activityId: item.activity.id }))
      this.embeddedActivityPlayer.set(output.activity)
    } finally {
      this.startingActivity.set(false)
    }
  }
}
