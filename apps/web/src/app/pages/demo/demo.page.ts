import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService } from '@platon/core/browser'
import { CourseService } from '@platon/feature/course/browser'
import { firstValueFrom } from 'rxjs'

@Component({
  selector: 'app-course-demo',
  templateUrl: './demo.page.html',
  styleUrls: ['./demo.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
})
export class CourseDemoPage implements OnInit {
  private readonly router = inject(Router)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly courseService = inject(CourseService)
  private readonly authService = inject(AuthService)

  async ngOnInit(): Promise<void> {
    this.activatedRoute.paramMap.subscribe(async (params) => {
      await this.redirectToDemo(params.get('id') as string)
    })
  }

  async redirectToDemo(courseId: string) {
    const demoAnswer = await firstValueFrom(this.courseService.accessDemo(courseId))
    if (demoAnswer.auth) {
      await this.authService.signInWithToken({
        accessToken: demoAnswer.accessToken || '',
        refreshToken: demoAnswer.refreshToken || '',
      })
    }
    await this.router.navigate(['/courses', demoAnswer.courseId], {
      replaceUrl: true,
    })
  }
}
