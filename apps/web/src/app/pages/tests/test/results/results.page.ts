import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CoursePresenter } from '../../../courses/course/course.presenter'
import { Activity, Course } from '@platon/feature/course/common'
import { firstValueFrom, Subscription } from 'rxjs'
import { ActivityResults, UserActivityResultsDistribution } from '@platon/feature/result/common'
import {
  KCileComponent,
  ResultBoxPlotComponent,
  ResultByExercisesComponent,
  ResultByMembersComponent,
  ResultService,
} from '@platon/feature/result/browser'
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header'
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'
import { NzGridModule } from 'ng-zorro-antd/grid'
import { DurationPipe, UiStatisticCardComponent } from '@platon/shared/ui'
import { MatCardModule } from '@angular/material/card'
import { NzSelectModule, NzSelectOptionInterface } from 'ng-zorro-antd/select'
import { NzSliderModule } from 'ng-zorro-antd/slider'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker'
import { CsvDownloadButtonComponent } from '@platon/feature/course/browser'

@Component({
  standalone: true,
  selector: 'app-test-results',
  templateUrl: './results.page.html',
  styleUrls: ['./results.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,

    NzPageHeaderModule,
    NzBreadCrumbModule,
    NzGridModule,
    NzSelectModule,
    NzSliderModule,
    NzInputNumberModule,
    NzDatePickerModule,

    MatIconModule,
    MatCardModule,

    DurationPipe,

    ResultByExercisesComponent,
    ResultByMembersComponent,
    ResultBoxPlotComponent,

    UiStatisticCardComponent,
    CsvDownloadButtonComponent,
  ],
})
export class TestResultsPage implements OnInit {
  private readonly subscriptions: Subscription[] = []
  private readonly presenter = inject(CoursePresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected context = this.presenter.defaultContext()

  protected course?: Course
  protected activity?: Activity
  protected results?: ActivityResults

  protected columnOrder?: string[]

  constructor(private readonly resultService: ResultService) {}

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.course = context.course
        const activities = await this.presenter.listActivities()
        if (activities.length >= 0) {
          this.activity = activities[0]
          this.results = await firstValueFrom(this.resultService.activityResults(this.activity.id))
        }
        this.columnOrder = this.results?.exercises.map((e) => e.title)
        this.changeDetectorRef.markForCheck()
      })
    )
  }
}
