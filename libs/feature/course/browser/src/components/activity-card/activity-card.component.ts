import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, inject, OnDestroy, OnInit } from '@angular/core'
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
import { UiModalDrawerComponent } from '@platon/shared/ui'
import { ThemeService } from '@platon/core/browser'
import { ResourceService } from '@platon/feature/resource/browser'
import { CoursePipesModule } from '../../pipes'
import { CourseActivitySettingsComponent } from '../activity-settings/activity-settings.component'
import { CourseItemComponent } from '../course-item/course-item.component'
import { CsvDownloadButtonComponent } from '../csv-download-button/csv-download-button.component'
import { CourseService } from '../../api/course.service'

@Component({
  standalone: true,
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
    CourseItemComponent,
    CsvDownloadButtonComponent,

    UiModalDrawerComponent,
    CourseActivitySettingsComponent,
  ],
})
export class CourseActivityCardComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly courseService = inject(CourseService)
  private readonly resourceService = inject(ResourceService)
  private themeSubscription?: Subscription

  @Input() item!: Activity

  async ngOnInit(): Promise<void> {
    this.themeSubscription = this.themeService.themeChange.subscribe(() => {
      this.cdr.markForCheck()
    })

    if (this.item.colorHue === undefined || this.item.colorHue === null) {
      const seed = this.item.id ? this.hashString(this.item.id) : Math.random()
      const hue = Math.floor(seed * 360)
      await firstValueFrom(this.courseService.updateActivity(this.item, { colorHue: hue }))
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe()
  }

  get color(): string {
    if (this.item.colorHue !== undefined && this.item.colorHue !== null) {
      return this.hueToCSS(this.item.colorHue)
    }

    return this.getRandomColorForActivity()
  }

  private hueToCSS(hue: number): string {
    const isDark = this.themeService.isDark
    const saturation = isDark ? 40 : 80
    const lightness = isDark ? 40 : 80
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  private getRandomColorForActivity(): string {
    const seed = this.item.id ? this.hashString(this.item.id) : Math.random()
    const hue = Math.floor(seed * 360)

    return this.hueToCSS(hue)
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash) / 2147483647
  }

  get completedExercises(): number {
    return Math.floor((this.item.progression * this.item.exerciseCount) / 100)
  }

  protected openTab(url: string): void {
    window.open(url, '_blank')
  }

  get editorUrl(): string {
    return this.resourceService.editorUrl(this.item.resourceId, 'latest')
  }
}
