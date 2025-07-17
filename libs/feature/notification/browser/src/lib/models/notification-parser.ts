import { ComponentType } from '@angular/cdk/portal'
import { InjectionToken, Injector } from '@angular/core'
import { Icon } from '@cisstech/nge/ui/icon'
import { Notification } from '@platon/feature/notification/common'

interface NotificationActionCallbacks {
  onClose: () => void
  onDelete: (notification: Notification) => void
}

export interface NotificationAction {
  type?: 'primary' | 'default' | 'danger'
  icon?: string
  label: string
  onClick: (callbacks: NotificationActionCallbacks) => void | Promise<void>
}

export interface NotificationParser<TData = unknown> {
  /**
   * Check if the parser supports the given notification.
   *  * @param notification The notification to check.
   *  * @returns `true` if the parser supports the notification, `false` otherwise.
   */
  support(notification: Notification<TData>): boolean

  /**
   * Render the notification.
   * @param notification The notification to render.
   * @param injector The injector to use for resolving dependencies.
   * @returns The rendered notification.
   */
  renderer(notification: Notification<TData>, injector: Injector): NotificationRenderer
}

export interface NotificationRenderer {
  icon?: Icon
  content: string | ComponentType<unknown>
  actions?: NotificationAction[]
  onClick?: (callbacks: NotificationActionCallbacks) => void | Promise<void>
}

export const NOTIFICATION = new InjectionToken<Notification>('NOTIFICATION')
export const NOTIFICATION_PARSER = new InjectionToken<NotificationParser[]>('NOTIFICATION_PARSER')
