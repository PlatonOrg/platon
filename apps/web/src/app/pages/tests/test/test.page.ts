import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { Subscription } from 'rxjs'
import { CoursePresenter } from '../../courses/course/course.presenter'
import { MatIconModule } from '@angular/material/icon'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb'
import { NzTypographyModule } from 'ng-zorro-antd/typography'
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header'
import { DialogModule, UserAvatarComponent } from '@platon/core/browser'
import { CourseSharingComponent } from '@platon/feature/course/browser'
import { UiLayoutTabDirective, UiLayoutTabsComponent } from '@platon/shared/ui'
import { TestPresenter } from './test.presenter'

@Component({
  standalone: true,
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CoursePresenter, TestPresenter],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,

    MatIconModule,

    NzTagModule,
    NzIconModule,
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
export class TestPage implements OnInit, OnDestroy {
  private readonly presenter = inject(CoursePresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly subscriptions: Subscription[] = []

  protected context = this.presenter.defaultContext()

  ngOnInit(): void {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.changeDetectorRef.markForCheck()
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
