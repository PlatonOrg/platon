import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core'
import { MonitorPresenter } from './monitor.presenter'
import { Subscription } from 'rxjs'
import { CommonModule, Location } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { DialogModule, DialogService } from '@platon/core/browser'
import {
  ResultBoxPlotComponent,
  ResultByMembersComponent,
  ResultHistogramComponent,
} from '@platon/feature/result/browser'
import {
  CourseMonitorPresenceService,
  ActivityModerationComponent,
  ActivityModerationEvent,
} from '@platon/feature/course/browser'
import { MatCardModule } from '@angular/material/card'

@Component({
  standalone: true,
  selector: 'app-course-activity-monitor',
  templateUrl: 'monitor.page.html',
  styleUrls: ['monitor.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MonitorPresenter],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,

    DialogModule,
    MatCardModule,

    ResultByMembersComponent,
    ResultHistogramComponent,
    ResultBoxPlotComponent,
    ActivityModerationComponent,
  ],
})
export class CourseActivityMonitorPage implements OnInit, OnDestroy {
  private readonly presenter = inject(MonitorPresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly location = inject(Location)
  private readonly monitorPresenceService = inject(CourseMonitorPresenceService)
  private readonly dialogService = inject(DialogService)

  private readonly subscriptions: Subscription[] = []

  protected context = this.presenter.defaultContext()
  protected columnOrder?: string[] = []
  protected gradeList: number[] = []

  ngOnInit(): void {
    this.presenter.contextChange
      .subscribe(async (context) => {
        this.context = context
        this.columnOrder = context.results?.exercises.map((e) => e.title)
        this.changeDetectorRef.markForCheck()
        if (context.state === 'READY' && context.activity && context.course) {
          await this.monitorPresenceService
            .subscribeToMonitorPresence(context.activity.id, context.course.id)
            .catch(console.error)
          this.updateGradeList()
        }
      })
      .add(() => this.subscriptions.push()),
      this.presenter.onDeletedActivity.subscribe(() => this.location.back()).add(() => this.subscriptions.push()),
      this.presenter.onExerciseChanges
        .subscribe(async () => {
          if (this.context.activity && this.context.course) {
            await this.presenter.refresh(this.context.course.id, this.context.activity.id)
          }
          this.changeDetectorRef.markForCheck()
        })
        .add(() => this.subscriptions.push())
  }

  ngOnDestroy(): void {
    // Unsubscribe from monitor presence when leaving the page
    this.monitorPresenceService.unsubscribeFromMonitorPresence()

    // Unsubscribe from all observables
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  private updateGradeList(): void {
    if (!this.context.results) return

    this.gradeList = this.context.results.users
      .flatMap((user) => Object.values(user.exercises).map((exercise) => exercise.grade))
      .filter((grade) => typeof grade === 'number') as number[]
  }

  private async openSessionsForUsers(selections: Array<{ userId: string; sessionId: string }>): Promise<void> {
    try {
      const promises = selections.map(async ({ userId, sessionId }) => {
        const user = this.context.results?.users.find((u) => u.id === userId)
        const fullName = user ? `${user.lastName} ${user.firstName}` : 'Utilisateur inconnu'
        try {
          await this.presenter.openActivityForUser(sessionId)
          this.dialogService.success(`Activité ouverte pour l'utilisateur ${fullName}`)
        } catch (error) {
          console.error(`Erreur lors de l'ouverture pour l'utilisateur ${userId}:`, error)
          this.dialogService.error(`Erreur lors de l'ouverture de l'activité pour l'utilisateur ${fullName}`)
        }
      })
      await Promise.allSettled(promises)
    } catch (error) {
      this.dialogService.error("Une erreur est survenue lors de l'ouverture des sessions.")
    }
  }

  private async closeSessionsForUsers(selections: Array<{ userId: string; sessionId: string }>): Promise<void> {
    try {
      const promises = selections.map(async ({ userId, sessionId }) => {
        const user = this.context.results?.users.find((u) => u.id === userId)
        const fullName = user ? `${user.lastName} ${user.firstName}` : 'Utilisateur inconnu'
        try {
          await this.presenter.closeActivityForUser(sessionId)
          this.dialogService.success(`Activité fermée pour l'utilisateur ${fullName}`)
        } catch (error) {
          console.error(`Erreur lors de la fermeture pour l'utilisateur ${userId}:`, error)
          this.dialogService.error(`Erreur lors de la fermeture de l'activité pour l'utilisateur ${fullName}`)
        }
      })
      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Erreur lors de la fermeture des sessions:', error)
      this.dialogService.error('Une erreur est survenue lors de la fermeture des sessions.')
    }
  }

  protected async onModerationAction(event: ActivityModerationEvent): Promise<void> {
    const { action, selections } = event
    switch (action) {
      case 'open':
        await this.openSessionsForUsers(selections)
        break
      case 'close':
        await this.closeSessionsForUsers(selections)
        break
    }
  }
}
