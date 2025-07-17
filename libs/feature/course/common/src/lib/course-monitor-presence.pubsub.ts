export const MONITOR_PRESENCE_SUBSCRIBE = 'monitor.presence.subscribe'
export const MONITOR_PRESENCE_UNSUBSCRIBE = 'monitor.presence.unsubscribe'

export interface MonitorPresencePayload {
  userId: string
  activityId: string
  courseId: string
}
