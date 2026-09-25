import { Activity, CourseSection, isGradedActivity } from '@platon/feature/course/common'

export interface GradedActivityItem {
  readonly activity: Activity
  readonly duration?: number
  readonly attempts?: number
}

/**
 * Construit la liste des TP notés d'un cours (cf. `isGradedActivity`), triés par section puis
 * par ordre, avec leur durée/nombre de tentatives quand ces limites sont définies (0 = illimité).
 * Partagé entre `course-student-overview` et `course-reader` pour rester cohérent entre les deux vues.
 */
export const buildGradedActivities = (sections: CourseSection[], activities: Activity[]): GradedActivityItem[] =>
  sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((section) =>
      activities
        .filter((activity) => activity.sectionId === section.id && isGradedActivity(activity))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((activity) => ({
          activity,
          duration:
            activity.activitySettings?.duration && activity.activitySettings.duration > 0
              ? activity.activitySettings.duration
              : undefined,
          attempts:
            activity.activitySettings?.actions?.retry && activity.activitySettings.actions.retry > 0
              ? activity.activitySettings.actions.retry
              : undefined,
        }))
    )
