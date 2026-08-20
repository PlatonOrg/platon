import { RestrictionList } from './activity-restriction.model'
import { ActivityPermissions } from './permissions.model'
import { ActivitySettings } from '@platon/feature/compiler'

/**
 * Nature d'un item de section de cours :
 * - `EXERCISE` : activité classique liée à une Resource compilée (comportement historique).
 * - `LESSON` : contenu narratif (blocs EditorJS), utilisé par le format de cours OpenClass.
 */
export enum ActivityKind {
  EXERCISE = 'exercise',
  LESSON = 'lesson',
}

export interface LessonContentBlock {
  readonly id?: string
  readonly type: string
  readonly data: Record<string, unknown>
}

export interface LessonContent {
  readonly time?: number
  readonly version?: string
  readonly blocks: LessonContentBlock[]
}

export interface Activity {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date

  readonly courseId: string
  readonly sectionId: string

  readonly openAt?: Date | null
  readonly closeAt?: Date | null
  readonly isChallenge: boolean
  readonly isPeerComparison: boolean
  readonly order?: number

  readonly kind: ActivityKind
  readonly title: string
  readonly resourceId: string
  readonly exerciseCount: number
  readonly state: ActivityOpenStates
  readonly timeSpent: number
  readonly progression: number
  readonly permissions: ActivityPermissions

  readonly lessonTitle?: string
  readonly content?: LessonContent | null
  readonly draft: boolean

  readonly ignoreRestrictions?: boolean // checkActivityDateRestrictions
  readonly restrictions?: RestrictionList[] | null

  readonly colorHue?: number

  readonly activitySettings?: ActivitySettings
  readonly code: string
}

export interface ActivityFilters {
  readonly sectionId?: string | null
  readonly challenge?: boolean | null
}

export interface CreateExerciseActivity {
  readonly kind?: ActivityKind.EXERCISE
  readonly sectionId: string

  readonly resourceId: string
  readonly resourceVersion: string

  readonly openAt?: Date
  readonly closeAt?: Date
  readonly isChallenge?: boolean
}

export interface CreateLessonActivity {
  readonly kind: ActivityKind.LESSON
  readonly sectionId: string

  readonly lessonTitle: string
  readonly content?: LessonContent
  readonly draft?: boolean

  readonly openAt?: Date
  readonly closeAt?: Date
}

export type CreateActivity = CreateExerciseActivity | CreateLessonActivity

export interface UpdateActivity {
  readonly openAt?: Date | null
  readonly closeAt?: Date | null
  readonly colorHue?: number | null
  readonly ignoreRestrictions?: boolean
  readonly activitySettings?: ActivitySettings
  readonly code?: string

  readonly lessonTitle?: string
  readonly content?: LessonContent
  readonly draft?: boolean
}

export interface ReloadActivity {
  readonly version?: string
}

export type ActivityOpenStates = 'opened' | 'closed' | 'planned'

export const calculateActivityOpenState = (value: {
  openAt?: Date | string | null
  closeAt?: Date | string | null
}): ActivityOpenStates => {
  const now = new Date()
  const openAt = value.openAt ? new Date(value.openAt) : undefined
  const closeAt = value.closeAt ? new Date(value.closeAt) : undefined

  if (openAt && closeAt) {
    if (now < openAt) {
      return 'planned'
    } else if (now >= openAt && now <= closeAt) {
      return 'opened'
    } else {
      return 'closed'
    }
  } else if (openAt) {
    if (now < openAt) {
      return 'planned'
    } else {
      return 'opened'
    }
  } else if (closeAt) {
    if (now <= closeAt) {
      return 'opened'
    } else {
      return 'closed'
    }
  } else {
    return 'opened'
  }
}
