import { Notification, NotificationType } from '@platon/feature/notification/common'
import { gql } from 'apollo-angular'
import { NotifFragment } from './notification.graphql.generated'

export const NOTIFICATION_QUERIES = gql`
  fragment Notif on Notification {
    id
    readAt
    createdAt
    updatedAt
    data
    groupId
    type
    user {
      id
      email
      username
      firstName
      lastName
    }
  }

  query ListNotifications($filters: NotificationFiltersInput, $first: Int, $after: String) {
    notifications(filters: $filters, first: $first, after: $after) {
      edges {
        cursor
        node {
          ...Notif
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }

  subscription OnChangeNotifications {
    onChangeNotifications {
      unreadCount
      newNotification {
        ...Notif
      }
    }
  }

  mutation MarkAsRead($id: UUID!) {
    markAsRead(id: $id)
  }

  mutation MarkAllAsRead {
    markAllAsRead
  }

  mutation DeleteNotification($id: UUID!) {
    deleteNotification(id: $id)
  }

  mutation DeleteAllNotifications {
    deleteAllNotifications
  }
`

/**
 * graphql want to use this format : ActivityClosed = 'ACTIVITY_CLOSED' but when i change NotificationType to use this format,
 * it want to use an other format : ActivityClosed = 'ActivityClosed' so i add this to convert to the NotificationType format...
 * */
const toNotificationType = (graphqlName: string): NotificationType => {
  const type = NotificationType[graphqlName as keyof typeof NotificationType]
  if (!type) {
    throw new Error(`Unknown notification type from l'API : ${graphqlName}`)
  }
  return type
}

export const decodeNotificationFragment = (fragment: NotifFragment): Notification => {
  return {
    id: fragment.id,
    createdAt: new Date(fragment.createdAt),
    updatedAt: new Date(fragment.updatedAt),
    data: fragment.data,
    groupId: fragment.groupId ?? null,
    type: toNotificationType(fragment.type),
    userId: fragment.user.id,
    readAt: fragment.readAt ? new Date(fragment.readAt) : null,
  }
}
