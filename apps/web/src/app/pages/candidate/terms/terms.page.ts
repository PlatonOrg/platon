import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'
import { OutputData } from '@editorjs/editorjs'
import { TestsService } from '@platon/feature/tests/browser'
import { EditorjsViewerComponent, UiEditorJsModule } from '@platon/shared/ui'
import { firstValueFrom } from 'rxjs'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { CourseService } from '@platon/feature/course/browser'
import { Activity } from '@platon/feature/course/common'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'

@Component({
  standalone: true,
  selector: 'app-terms',
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    NgeMarkdownModule,
    UiEditorJsModule,
    FormsModule,
    EditorjsViewerComponent,
    NzButtonModule,
    NzCheckboxModule,
  ],
})
export class TestTermsPage {
  testId?: string

  error?: string

  terms?: OutputData

  activity?: Activity

  hasReadTerms = false

  constructor(
    private route: ActivatedRoute,
    private readonly testsService: TestsService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly courseService: CourseService,
    private readonly router: Router
  ) {
    this.route.queryParams.subscribe(async (params) => {
      this.testId = params['id']
      if (!this.testId) {
        this.error = 'Test ID is required.'
        this.changeDetectorRef.markForCheck()
        return
      }
      this.terms = await firstValueFrom(this.testsService.getCompletedTestTerms(this.testId))
      this.changeDetectorRef.markForCheck()

      const course = await firstValueFrom(this.courseService.find({ id: this.testId }))
      const activities = (await firstValueFrom(this.courseService.listActivities(course))).resources
      if (activities.length >= 0) {
        this.activity = activities[0]
      }
      this.changeDetectorRef.markForCheck()
    })
  }

  protected async onAccept(): Promise<void> {
    if (!this.hasReadTerms) {
      return
    }
    if (!this.activity) {
      this.error = 'No activity found for this test.'
      this.changeDetectorRef.markForCheck()
      return
    }
    await this.router.navigate(['/player/activity', this.activity.id])
  }
}
