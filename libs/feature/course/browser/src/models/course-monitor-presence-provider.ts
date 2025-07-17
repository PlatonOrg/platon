import { MonitorPresencePayload } from '@platon/feature/course/common'

export abstract class CourseMonitorPresenceProvider {
  abstract subscribeToMonitorPresence(payload: MonitorPresencePayload): void
  abstract unsubscribeFromMonitorPresence(payload: MonitorPresencePayload): void
}
