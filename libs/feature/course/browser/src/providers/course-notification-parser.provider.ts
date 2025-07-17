import { Injector } from '@angular/core'
import { Router } from '@angular/router'
import { ThemeAwareIconService } from '@platon/core/browser'
import {
  ACTIVITY_MEMBER_CREATION_NOTIFICATION,
  ActivityClosedNotification,
  ActivityMemberCreationNotification,
  CORRECTION_AVAILABLE_NOTIFICATION,
  CORRECTION_PENDING_NOTIFICATION,
  CORRECTOR_CREATED_NOTIFICATION,
  CORRECTOR_REMOVED_NOTIFICATION,
  COURSE_MEMBER_CREATION_NOTIFICATION,
  CorrectionAvailableNotification,
  CorrectionPendingNotification,
  CorrectorCreatedNotification,
  CorrectorRemovedNotification,
  CourseMemberCreationNotification,
  ExerciseChangesNotification,
  ModerationActivityChangesNotification,
  ResourceMovedByAdminNotification,
} from '@platon/feature/course/common'
import { NotificationParser, NotificationRenderer } from '@platon/feature/notification/browser'

export const CourseMemberCreationNotificationParser: NotificationParser<CourseMemberCreationNotification> = {
  support(notification): boolean {
    return notification.data.type === COURSE_MEMBER_CREATION_NOTIFICATION
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Vous êtes désormais membre du cours "${notification.data.courseName}"`,
      onClick: ({ onClose }) => {
        router.navigate([`/courses/${notification.data.courseId}`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const ActivityMemberCreationNotificationParser: NotificationParser<ActivityMemberCreationNotification> = {
  support(notification): boolean {
    return notification.data.type === ACTIVITY_MEMBER_CREATION_NOTIFICATION
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Vous êtes désormais membre de l'activité "${notification.data.activityName}"`,
      onClick: ({ onClose }) => {
        router.navigate([`/courses/${notification.data.courseId}`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const CorrectorCreatedNotificationParser: NotificationParser<CorrectorCreatedNotification> = {
  support(notification): boolean {
    return notification.data.type === CORRECTOR_CREATED_NOTIFICATION
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Vous êtes désormais correcteur de l'activité "${notification.data.activityName}"`,
      onClick: ({ onClose }) => {
        router.navigate([`/courses/${notification.data.courseId}`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const CorrectorRemovedNotificationParser: NotificationParser<CorrectorRemovedNotification> = {
  support(notification): boolean {
    return notification.data.type === CORRECTOR_REMOVED_NOTIFICATION
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Vous n'êtes plus correcteur de l'activité "${notification.data.activityName}"`,
      onClick: ({ onClose }) => {
        router.navigate([`/courses/${notification.data.courseId}`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const CorrectionPendingNotificationParser: NotificationParser<CorrectionPendingNotification> = {
  support(notification): boolean {
    return notification.data.type === CORRECTION_PENDING_NOTIFICATION
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Vous avez de nouvelles corrections en attente pour le cours "${notification.data.courseName}"`,
      onClick: ({ onClose }) => {
        router.navigate([`/player/correction/${notification.data.courseId}`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const CorrectionAvailableNotificationParser: NotificationParser<CorrectionAvailableNotification> = {
  support(notification): boolean {
    return notification.data.type === CORRECTION_AVAILABLE_NOTIFICATION
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Vous pouvez désormais accéder à la correction de l'activité "${notification.data.activityName}"`,
      onClick: ({ onClose }) => {
        router.navigate([`/player/activity/${notification.data.activityId}`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const ActivityClosedNotificationParser: NotificationParser<ActivityClosedNotification> = {
  support(notification): boolean {
    return notification.data.type === 'ACTIVITY-CLOSED'
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `L'activité "${notification.data.activityName}" du cours "${notification.data.courseName}" est désormais fermée`,
      onClick: ({ onClose }) => {
        router.navigate([`/courses/${notification.data.courseId}`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const ResourceMovedByAdminNotificationParser: NotificationParser<ResourceMovedByAdminNotification> = {
  support(notification): boolean {
    return notification.data.type === 'RESOURCE-MOVED-BY-ADMIN'
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const router = injector.get(Router)
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Votre ressource "${notification.data.resourceName}" du cercle "${notification.data.circleName}" a été déplacée dans votre cercle personnel par un administrateur`,
      onClick: ({ onClose }) => {
        router.navigate([`/resources/${notification.data.resourceId}/overview`]).catch(console.error)
        onClose()
      },
    }
  },
}

export const ExerciseChangesNotificationParser: NotificationParser<ExerciseChangesNotification> = {
  support(notification): boolean {
    return notification.data.type === 'EXERCISE-CHANGES'
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Des modifications ont été apportées à l'exercice dans la session`,
      onClick: ({ onClose }) => {
        console.error('ExerciseChangesNotificationParser nothing to do here')
        onClose()
      },
    }
  },
}

export const ModerationActivityChangesNotificationParser: NotificationParser<ModerationActivityChangesNotification> = {
  support(notification): boolean {
    return notification.data.type === 'MODERATION-ACTIVITY-CHANGES'
  },
  renderer(notification, injector: Injector): NotificationRenderer {
    const themeAwareIconService = injector.get(ThemeAwareIconService)
    return {
      icon: themeAwareIconService.createIcon(`/assets/images/courses/course.svg`),
      content: `Des modifications ont été apportées à l'activité dans la session`,
      onClick: ({ onClose }) => {
        console.error('ModerationActivityChangesNotificationParser nothing to do here')
        onClose()
      },
    }
  },
} // TODO: User should have their activity automatically refreshed

export const CourseNotificationParsers: NotificationParser<unknown>[] = [
  CourseMemberCreationNotificationParser,
  ActivityMemberCreationNotificationParser,
  CorrectorCreatedNotificationParser,
  CorrectorRemovedNotificationParser,
  CorrectionPendingNotificationParser,
  CorrectionAvailableNotificationParser,
  ActivityClosedNotificationParser,
  ResourceMovedByAdminNotificationParser,
  ExerciseChangesNotificationParser,
  ModerationActivityChangesNotificationParser,
]
