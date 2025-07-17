import { Injectable, inject, OnDestroy } from '@angular/core'
import { MonitorPresencePayload } from '@platon/feature/course/common'
import { AuthService } from '@platon/core/browser'
import { CourseMonitorPresenceProvider } from '../models/course-monitor-presence-provider'

@Injectable({
  providedIn: 'root',
})
export class CourseMonitorPresenceService implements OnDestroy {
  // Keep track of current subscriptions to prevent duplicate subscriptions
  private currentSubscription: { activityId: string; courseId: string } | null = null
  private readonly authService = inject(AuthService)
  private readonly courseMonitorPresenceProvider = inject(CourseMonitorPresenceProvider)

  private userId?: string

  /**
   * Subscribe to monitor presence for an activity
   * This notifies the server that the user is actively monitoring this activity
   */
  async subscribeToMonitorPresence(activityId: string, courseId: string): Promise<void> {
    // Unsubscribe from any existing subscription first
    this.unsubscribeFromMonitorPresence()

    this.userId = await this.authService.ready().then((user) => user?.id)
    const userId = this.userId
    if (!userId) {
      console.error('Cannot subscribe to monitor presence: userId not found')
      return
    }

    const payload: MonitorPresencePayload = {
      userId,
      activityId,
      courseId,
    }

    // Store the current subscription
    this.currentSubscription = { activityId, courseId }

    this.courseMonitorPresenceProvider.subscribeToMonitorPresence(payload)
  }

  /**
   * Unsubscribe from monitor presence for the current activity
   * This notifies the server that the user is no longer monitoring this activity
   */
  unsubscribeFromMonitorPresence(): void {
    if (!this.currentSubscription || !this.userId) {
      return
    }

    const payload: MonitorPresencePayload = {
      userId: this.userId,
      activityId: this.currentSubscription.activityId,
      courseId: this.currentSubscription.courseId,
    }

    this.courseMonitorPresenceProvider.unsubscribeFromMonitorPresence(payload)
  }

  ngOnDestroy(): void {
    this.unsubscribeFromMonitorPresence()
  }
}
