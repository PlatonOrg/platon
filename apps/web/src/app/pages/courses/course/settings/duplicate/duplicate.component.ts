import { Component, inject, input, signal } from '@angular/core'
import { CourseService, CourseItemComponent } from '@platon/feature/course/browser'
import { UiSearchBarComponent, SearchBar } from '@platon/shared/ui'
import { CommonModule } from '@angular/common'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { Course } from '@platon/feature/course/common'
import Fuse from 'fuse.js'
import { firstValueFrom, of } from 'rxjs'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { ListResponse } from '@platon/core/common'
import { DialogService } from '@platon/core/browser'

@Component({
  selector: 'app-course-duplicate',
  templateUrl: './duplicate.component.html',
  styleUrls: ['./duplicate.component.scss'],
  imports: [CommonModule, UiSearchBarComponent, NzButtonModule, NzPopconfirmModule, NzSpinModule, CourseItemComponent],
})
export class CourseDuplicateComponent {
  protected searching = signal(false)
  protected items = signal<Course[]>([])
  protected askToLoad = signal<boolean>(false)
  protected isProcessing = signal<boolean>(false)
  protected readonly selectedCourse = signal<Course | null>(null)
  private readonly dialogService = inject(DialogService)
  currentCourse = input.required<Course>()

  constructor(private readonly courseService: CourseService) {}

  protected readonly searchbar: SearchBar<string> = {
    placeholder: 'Essayez un nom...',
    filterer: {
      run: (query) => {
        const suggestions = new Set<string>(this.items().map((e) => e.name))
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
    onSearch: (query) => this.search(query),
  }

  async search(query: string): Promise<void> {
    this.searching.set(true)
    try {
      const response = await firstValueFrom(
        this.courseService.search({ search: query, expands: ['permissions', 'statistic'] })
      )
      this.items.set(this.searchFilter(response))
    } finally {
      this.searching.set(false)
    }
  }

  /** Keep only the course where the user is a teacher and remove the current course from the list */
  private searchFilter(response: ListResponse<Course>): Course[] {
    return response.resources.filter((course) => course.permissions?.update && course.id !== this.currentCourse().id)
  }

  protected async processDuplicate() {
    const source = this.selectedCourse()
    if (!source) return

    this.isProcessing.set(true)
    try {
      await firstValueFrom(this.courseService.duplicate(source.id, this.currentCourse().id))

      this.dialogService.success('Le cours a été dupliqué avec succès')
      this.reset()
    } catch (error) {
      this.dialogService.error('Impossible de dupliquer le cours')
      console.error('Erreur lors de la duplication :', error)
    } finally {
      this.isProcessing.set(false)
    }
  }

  async startDuplication() {
    this.askToLoad.set(true)
    await this.loadInitialCourse()
  }

  private async loadInitialCourse(): Promise<void> {
    this.searching.set(true)
    try {
      const response = await firstValueFrom(
        this.courseService.search({
          expands: ['permissions', 'statistic'],
        })
      )
      this.items.set(this.searchFilter(response))
    } finally {
      this.searching.set(false)
    }
  }

  reset() {
    this.searching.set(false)
    this.askToLoad.set(false)
    this.selectedCourse.set(null)
    this.items.set([])
  }

  protected selectCourse(course: Course) {
    this.selectedCourse.set(course)
  }
}
