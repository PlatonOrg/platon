import { Injectable, inject } from '@angular/core'
import { MonitorPresencePayload } from '@platon/feature/course/common'
import { AuthService } from '@platon/core/browser'
import { CourseMonitorPresenceProvider } from '../models/course-monitor-presence-provider'

/**
 * Stateless facade: chaque appel notifie le serveur pour l'activité passée en paramètre.
 * Le suivi de "à quoi je suis actuellement abonné" doit rester côté appelant (ex: une page),
 * pas ici, car ce service est un singleton `root` partagé par toute l'application.
 */
@Injectable({
  providedIn: 'root',
})
export class CourseMonitorPresenceService {
  private readonly authService = inject(AuthService)
  private readonly courseMonitorPresenceProvider = inject(CourseMonitorPresenceProvider)

  /**
   * Subscribe to monitor presence for an activity
   * This notifies the server that the user is actively monitoring this activity
   */
  async subscribeToMonitorPresence(activityId: string): Promise<void> {
    const payload = await this.buildPayload(activityId)
    if (!payload) {
      return
    }
    this.courseMonitorPresenceProvider.subscribeToMonitorPresence(payload)
  }

  /**
   * Unsubscribe from monitor presence for an activity
   * This notifies the server that the user is no longer monitoring this activity
   */
  async unsubscribeFromMonitorPresence(activityId: string): Promise<void> {
    const payload = await this.buildPayload(activityId)
    if (!payload) {
      return
    }
    this.courseMonitorPresenceProvider.unsubscribeFromMonitorPresence(payload)
  }

  private async buildPayload(activityId: string): Promise<MonitorPresencePayload | undefined> {
    const userId = await this.authService.ready().then((user) => user?.id)
    if (!userId) {
      console.error('Cannot notify monitor presence: userId not found')
      return undefined
    }
    return { userId, activityId }
  }
}
