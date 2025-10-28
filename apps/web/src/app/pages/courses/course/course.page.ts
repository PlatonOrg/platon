import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { Subscription } from 'rxjs'

import { MatIconModule } from '@angular/material/icon'

import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { NzTypographyModule } from 'ng-zorro-antd/typography'

import { DialogModule, UserAvatarComponent } from '@platon/core/browser'
import { UiLayoutTabDirective, UiLayoutTabsComponent } from '@platon/shared/ui'

import { CourseSharingComponent } from '@platon/feature/course/browser'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { CoursePresenter } from './course.presenter'
import { Title } from '@angular/platform-browser'

@Component({
  standalone: true,
  selector: 'app-course',
  templateUrl: './course.page.html',
  styleUrls: ['./course.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CoursePresenter],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,

    MatIconModule,

    NzTagModule,
    NzIconModule,
    NzButtonModule,
    NzPopoverModule,
    NzBreadCrumbModule,
    NzTypographyModule,
    NzPageHeaderModule,

    DialogModule,

    UserAvatarComponent,
    CourseSharingComponent,
    UiLayoutTabsComponent,
    UiLayoutTabDirective,
  ],
})
export class CoursePage implements OnInit, OnDestroy {
  private readonly presenter = inject(CoursePresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly subscriptions: Subscription[] = []

  protected context = this.presenter.defaultContext()

  // for the tab name
  constructor(private titleService: Title){}

  ngOnInit(): void {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.changeDetectorRef.markForCheck()

        if (this.context.course?.name) {
          this.titleService.setTitle('Cours - ' + this.context.course?.name)
        }
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected async updateName(name: string) {
    if (name.trim()) {
      await this.presenter.update({ name })
    }
  }

  protected async updateDesc(desc: string) {
    if (desc.trim()) {
      await this.presenter.update({ desc })
    }
  }
}
