import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  signal,
  computed,
} from '@angular/core'
import { RouterModule } from '@angular/router'
import { firstValueFrom, Subscription } from 'rxjs'

import { MatCardModule } from '@angular/material/card'

import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzGridModule } from 'ng-zorro-antd/grid'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzProgressModule } from 'ng-zorro-antd/progress'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzDropDownModule } from 'ng-zorro-antd/dropdown'

import { MatIconModule } from '@angular/material/icon'
import { Activity } from '@platon/feature/course/common'
import { ThemeService } from '@platon/core/browser'
import { ResourceService } from '@platon/feature/resource/browser'
import { CoursePipesModule } from '../../pipes'
import { CsvDownloadButtonComponent } from '../csv-download-button/csv-download-button.component'
import { CourseActivitySettingsDrawerComponent } from '../activity-settings-drawer/activity-settings-drawer.component'
import { CourseService } from '../../api/course.service'

@Component({
  selector: 'course-activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatCardModule,
    NzGridModule,
    NzIconModule,
    NzBadgeModule,
    NzButtonModule,
    NzToolTipModule,
    NzProgressModule,
    NzToolTipModule,
    NzDropDownModule,
    CoursePipesModule,
    CsvDownloadButtonComponent,
    CourseActivitySettingsDrawerComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CourseActivityCardComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly courseService = inject(CourseService)
  private readonly resourceService = inject(ResourceService)
  private themeSubscription?: Subscription

  item = input.required<Activity>()

  private readonly localActivity = signal<Activity | null>(null)
  protected readonly activity = computed(() => this.localActivity() ?? this.item())

  async ngOnInit(): Promise<void> {
    this.themeSubscription = this.themeService.themeChange.subscribe(() => {
      this.cdr.markForCheck()
    })

    if (this.activity().colorHue === undefined || this.activity().colorHue === null) {
      await firstValueFrom(this.courseService.updateActivity(this.activity(), { colorHue: -1 }))
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe()
  }

  get color(): string {
    if (this.activity().colorHue !== undefined && this.activity().colorHue !== null) {
      return this.hueToCSS(this.activity().colorHue!)
    }

    return this.hueToCSS(-1)
  }

  private get presetColors(): string[] {
    return [
      'var(--brand-color-primary)',
      'var(--brand-background-darker-10)',
      'var(--brand-background-darker-20)',
      'var(--brand-background-darker-30)',
    ]
  }

  private hueToCSS(hue: number): string {
    if (hue < 0) {
      const presetIndex = Math.abs(hue) - 1
      if (presetIndex >= 0 && presetIndex < this.presetColors.length) {
        return this.presetColors[presetIndex]
      }
      return this.presetColors[0]
    }

    const isDark = this.themeService.isDark
    const saturation = isDark ? 40 : 80
    const lightness = isDark ? 40 : 80
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  get completedExercises(): number {
    return Math.floor((this.activity().progression * this.activity().exerciseCount) / 100)
  }

  protected openTab(url: string): void {
    window.open(url, '_blank')
  }

  get editorUrl(): string {
    return this.resourceService.editorUrl(this.activity().resourceId, 'latest')
  }

  protected onActivityChange(activity: Activity): void {
    this.localActivity.set(activity)
    this.cdr.markForCheck()
  }

  protected isValidDate(date: Date | null | undefined): boolean {
    return date !== new Date('Invalid Date') && date !== null && date !== undefined
  }
}
