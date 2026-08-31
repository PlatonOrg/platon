import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  input,
  output,
  inject,
} from '@angular/core'

import { MatIconModule } from '@angular/material/icon'

import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzProgressModule } from 'ng-zorro-antd/progress'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

import { NgeUiListModule } from '@cisstech/nge/ui/list'

import { Router, RouterModule } from '@angular/router'
import { Course } from '@platon/feature/course/common'
import { antTagColorFromPercentage } from '@platon/shared/ui'
import { NzButtonModule } from 'ng-zorro-antd/button'

@Component({
  selector: 'course-item',
  templateUrl: './course-item.component.html',
  styleUrls: ['./course-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    NzIconModule,
    NzButtonModule,
    NzBadgeModule,
    NzBadgeModule,
    NzTooltipModule,
    NzProgressModule,
    NgeUiListModule,
  ],
})
export class CourseItemComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly router = inject(Router)

  @Input() item!: Course
  @Input() simple = false

  readonly showArchiveButton = input<boolean>(false)
  readonly isArchived = input<boolean>(false)
  readonly archiveToggle = output<void>()

  protected name = ''
  protected desc = ''
  protected progressColor = 'primary'
  protected isTitleTruncated = false

  ngOnChanges(): void {
    this.name = this.item.name
    this.desc = this.item.desc as string
    if (this.simple) {
      this.desc = ''
    }

    this.progressColor = antTagColorFromPercentage(this.item.statistic?.progression ?? 0)
  }

  protected async navigate(): Promise<void> {
    await this.router.navigate(['/courses', this.item.id])
  }

  protected checkTitleTruncation(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    const titleEl = el.closest('.article-title') ?? el.parentElement
    this.isTitleTruncated = titleEl ? titleEl.scrollHeight > titleEl.clientHeight : false
    this.cdr.detectChanges()
  }
}
