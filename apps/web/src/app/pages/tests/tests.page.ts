import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'
import { AuthService } from '@platon/core/browser'
import { User, UserRoles } from '@platon/core/common'
import { CourseService } from '@platon/feature/course/browser'
import { Course, CourseFilters, CourseOrderings } from '@platon/feature/course/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { firstValueFrom, Subscription } from 'rxjs'

@Component({
  standalone: true,
  selector: 'app-tests',
  templateUrl: './tests.page.html',
  styleUrls: ['./tests.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    MatCardModule,
    MatIconModule,
    NzToolTipModule,
  ],
})
export class TestsPage implements OnInit {
  private readonly subscriptions: Subscription[] = []

  private user?: User
  protected canCreateTest = false

  protected searching = true
  protected filters: CourseFilters = {}
  protected items: Course[] = []
  protected totalMatches = 0

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly authService: AuthService,
    private readonly courseService: CourseService
  ) {}

  async ngOnInit() {
    this.user = (await this.authService.ready()) as User
    this.canCreateTest = this.user?.role === UserRoles.teacher || this.user?.role === UserRoles.admin
    this.searching = true
    this.changeDetectorRef.markForCheck()
    this.filters = {
      ...this.filters,
      order: CourseOrderings.UPDATED_AT,
      isTest: true,
    }
    const response = await firstValueFrom(
      this.courseService.search({ ...this.filters, expands: ['permissions', 'statistic'] })
    )
    this.items = response.resources
    this.totalMatches = response.total
    this.searching = false
    this.changeDetectorRef.markForCheck()
  }
}
