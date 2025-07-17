import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { CourseMonitorPresenceProvider } from '../models/course-monitor-presence-provider'
import { MonitorPresencePayload } from '@platon/feature/course/common'

@Injectable()
export class RemoteCourseMonitorPresenceProvider extends CourseMonitorPresenceProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  subscribeToMonitorPresence(payload: MonitorPresencePayload): void {
    this.http.post('/api/v1/courses/monitor-presence/subscribe', payload).subscribe({
      next: () => {
        console.log(`Successfully subscribed to monitor presence for activity ${payload.activityId}`)
      },
      error: (err: unknown) => {
        console.error(`Error subscribing to monitor presence:`, err)
      },
    })
  }

  unsubscribeFromMonitorPresence(payload: MonitorPresencePayload): void {
    this.http.post('/api/v1/courses/monitor-presence/unsubscribe', payload).subscribe({
      next: () => {
        console.log(`Successfully unsubscribed from monitor presence for activity ${payload.activityId}`)
      },
      error: (err: unknown) => {
        console.error(`Error unsubscribing from monitor presence:`, err)
      },
    })
  }
}
