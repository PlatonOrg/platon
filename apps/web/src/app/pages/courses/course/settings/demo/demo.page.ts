import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Subscription, firstValueFrom } from 'rxjs';
import { CoursePresenter } from '../../course.presenter';
import { CourseService } from '@platon/feature/course/browser';

@Component({
  standalone: true,
  selector: 'app-course-demo',
  templateUrl: './demo.page.html',
  styleUrls: ['./demo.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzButtonModule],
})
export class CourseDemoPage implements OnInit, OnDestroy {
  private readonly subscriptions: Subscription[] = [];

  protected context = this.presenter.defaultContext();
  protected courseId = '';

  constructor(
    private readonly presenter: CoursePresenter,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly courseService: CourseService
  ) {}

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context;
        const { course } = context;
        if (course) {
          this.courseId = course.id;
        }

        this.changeDetectorRef.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  // mettre dans presse papier ou icone copier coller
  // ne pas afficher si non teacher/admin
  async createDemo() {
    const demo = await firstValueFrom(
      this.courseService.createDemo(this.courseId)
    );
    alert(`Demo URI: demo/${demo.uri}`);
    this.changeDetectorRef.markForCheck();
  }
}
