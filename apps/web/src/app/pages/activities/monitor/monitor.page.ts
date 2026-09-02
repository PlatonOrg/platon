import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core'
import { MonitorPresenter } from './monitor.presenter'
import { Subscription } from 'rxjs'
import { CommonModule, Location } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
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
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'

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
    NzButtonModule,
    NzIconModule,

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
  private readonly router = inject(Router)
  private readonly monitorPresenceService = inject(CourseMonitorPresenceService)
  private readonly dialogService = inject(DialogService)

  private readonly subscriptions: Subscription[] = []
  // Activité actuellement suivie par CETTE page (la route étant réutilisée entre activités,
  // ngOnDestroy ne suffit pas pour détecter un changement d'activité en cours de session).
  private subscribedActivityId?: string

  protected context = this.presenter.defaultContext()
  protected columnOrder?: string[] = []
  protected gradeList: number[] = []
  ngOnInit(): void {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.columnOrder = context.results?.exercises.map((e) => e.title)
        this.changeDetectorRef.markForCheck()
        if (context.state === 'READY' && context.activity && context.course) {
          await this.switchMonitoredActivity(context.activity.id)
          this.updateGradeList()
        }
      })
    )

    this.subscriptions.push(this.presenter.onDeletedActivity.subscribe(() => this.location.back()))
  }

  ngOnDestroy(): void {
    // Unsubscribe from monitor presence when leaving the page
    if (this.subscribedActivityId) {
      this.monitorPresenceService.unsubscribeFromMonitorPresence(this.subscribedActivityId).catch(console.error)
    }

    // Unsubscribe from all observables
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  /**
   * Bascule l'abonnement de présence de l'ancienne activité (le cas échéant) vers la nouvelle.
   * Nécessaire car la route ':courseId/:activityId' réutilise cette page entre deux activités.
   */
  private async switchMonitoredActivity(activityId: string): Promise<void> {
    if (this.subscribedActivityId === activityId) {
      return
    }
    if (this.subscribedActivityId) {
      await this.monitorPresenceService.unsubscribeFromMonitorPresence(this.subscribedActivityId).catch(console.error)
    }
    await this.monitorPresenceService.subscribeToMonitorPresence(activityId).catch(console.error)
    this.subscribedActivityId = activityId
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

  protected async onRegenerateCode(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      nzTitle: 'Régénérer le code',
      nzContent: "L'ancien code ne fonctionnera plus, continuer ?",
      nzOkText: 'Oui',
      nzCancelText: 'Non',
    })
    if (!confirmed) return

    try {
      await this.presenter.regenerateActivityCode()
      this.dialogService.success('Le code a été régénéré.')
    } catch (error) {
      console.error('Erreur lors de la régénération du code:', error)
      this.dialogService.error('Une erreur est survenue lors de la régénération du code.')
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

  protected async navigateToCourse(): Promise<void> {
    if (!this.context.course?.id) return
    if (this.context.isTest) {
      await this.router.navigate(['/tests', this.context.course.id])
    } else {
      await this.router.navigate(['/courses', this.context.course.id])
    }
  }

  protected isOpen(): boolean {
    const openAt = this.context.activity?.openAt
    const closeAt = this.context.activity?.closeAt
    return (
      (openAt === undefined || openAt === null || new Date() >= new Date(openAt)) &&
      (closeAt === undefined || closeAt === null || new Date() <= new Date(closeAt))
    )
  }
}
