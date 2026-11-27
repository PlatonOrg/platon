import { Injectable, Logger } from '@nestjs/common'
import { PubSubService } from '@platon/core/server'
import {
  MONITOR_PRESENCE_SUBSCRIBE,
  MONITOR_PRESENCE_UNSUBSCRIBE,
  MonitorPresencePayload,
} from '@platon/feature/course/common'

@Injectable()
export class CourseMonitorPresenceService {
  private readonly logger = new Logger(CourseMonitorPresenceService.name)
  // Store of active monitor subscriptions: activityId -> userId[]
  private readonly activeMonitors: Map<string, Set<string>> = new Map()

  constructor(private readonly pubSubService: PubSubService) {
    this.initSubscriptions()
  }

  private initSubscriptions(): void {
    // Subscribe to monitor presence events
    this.pubSubService
      .subscribe<MonitorPresencePayload>(MONITOR_PRESENCE_SUBSCRIBE, (payload) => {
        this.addActiveMonitor(payload.activityId, payload.userId)
      })
      .catch(this.logger.error.bind(this.logger))

    this.pubSubService
      .subscribe<MonitorPresencePayload>(MONITOR_PRESENCE_UNSUBSCRIBE, (payload) => {
        this.removeActiveMonitor(payload.activityId, payload.userId)
      })
      .catch(this.logger.error.bind(this.logger))
  }

  /**
   * Add a user as actively monitoring an activity
   */
  private addActiveMonitor(activityId: string, userId: string): void {
    if (!this.activeMonitors.has(activityId)) {
      this.activeMonitors.set(activityId, new Set())
    }

    const activityMonitors = this.activeMonitors.get(activityId)
    activityMonitors?.add(userId)

    this.logger.log(
      `User ${userId} is now monitoring activity ${activityId}. Active monitors: ${activityMonitors?.size}`
    )
  }

  /**
   * Remove a user from actively monitoring an activity
   */
  private removeActiveMonitor(activityId: string, userId: string): void {
    const activityMonitors = this.activeMonitors.get(activityId)
    if (activityMonitors) {
      activityMonitors.delete(userId)

      this.logger.log(
        `User ${userId} stopped monitoring activity ${activityId}. Active monitors: ${activityMonitors.size}`
      )

      // Clean up empty sets
      if (activityMonitors.size === 0) {
        this.activeMonitors.delete(activityId)
      }
    }
  }

  /**
   * Get all users actively monitoring a specific activity
   */
  getActiveMonitoringUsers(activityId: string): string[] {
    const monitoringUsers = this.activeMonitors.get(activityId)
    if (!monitoringUsers) {
      return []
    }
    return Array.from(monitoringUsers)
  }
}
