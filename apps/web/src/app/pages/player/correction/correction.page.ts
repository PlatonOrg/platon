import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { PlayerCorrectionComponent } from '@platon/feature/player/browser'
import { Player } from '@platon/feature/player/common'
import { ResultService } from '@platon/feature/result/browser'
import { ActivityCorrection, CourseCorrection } from '@platon/feature/result/common'
import { UiErrorComponent } from '@platon/shared/ui'
import { firstValueFrom } from 'rxjs'
import { CourseService } from '@platon/feature/course/browser'
import { Activity, FindCourse } from '@platon/feature/course/common'

@Component({
  standalone: true,
  selector: 'app-player-correction',
  templateUrl: './correction.page.html',
  styleUrls: ['./correction.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzSpinModule, UiErrorComponent, PlayerCorrectionComponent],
})
export class PlayerCorrectionPage implements OnInit {
  protected player?: Player
  protected loading = true
  protected error: unknown
  protected correction?: CourseCorrection

  constructor(
    private readonly resultService: ResultService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly courseService: CourseService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true

    try {
      const courseId = this.getCourseId()
      const activities = await this.getActivities(courseId)
      this.correction = {
        courseId: courseId.id,
        ActivityCorrections: (await this.getCorrections(activities)).filter(
          (correction): correction is ActivityCorrection => correction !== undefined
        ),
      }
    } catch (error) {
      this.handleError(error)
    } finally {
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }
  }

  private getCourseId(): FindCourse {
    const params = this.activatedRoute.snapshot.paramMap
    return { id: params.get('id') } as FindCourse
  }

  private async getActivities(courseId: FindCourse): Promise<Activity[]> {
    const course = await firstValueFrom(this.courseService.find(courseId))
    const activities = await firstValueFrom(this.courseService.listActivities(course))
    return activities.resources
  }

  private async getCorrections(activities: Activity[]): Promise<(ActivityCorrection | undefined)[]> {
    return Promise.all(
      activities.map(async (activity) => {
        try {
          return await firstValueFrom(this.resultService.findCorrection(activity.id))
        } catch (error) {
          return undefined
        }
      })
    )
  }

  private handleError(error: unknown): void {
    this.error = error
    console.error('Error in ngOnInit', error)
  }
}
