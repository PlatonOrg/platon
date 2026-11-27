import { RestrictionList } from './activity-restriction.model'
import { ActivityPermissions } from './permissions.model'
import { ActivitySettings } from '@platon/feature/compiler'

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

  readonly title: string
  readonly resourceId: string
  readonly exerciseCount: number
  readonly state: ActivityOpenStates
  readonly timeSpent: number
  readonly progression: number
  readonly permissions: ActivityPermissions

  readonly ignoreRestrictions?: boolean // checkActivityDateRestrictions
  readonly restrictions?: RestrictionList[] | null

  readonly colorHue?: number
  readonly hidden?: boolean
  readonly activitySettings?: ActivitySettings
  readonly code: string
}

export interface ActivityFilters {
  readonly sectionId?: string | null
  readonly challenge?: boolean | null
}

export interface CreateActivity {
  readonly sectionId: string

  readonly resourceId: string
  readonly resourceVersion: string

  readonly openAt?: Date
  readonly closeAt?: Date
  readonly isChallenge?: boolean
}

export interface UpdateActivity {
  readonly openAt?: Date | null
  readonly closeAt?: Date | null
  readonly colorHue?: number | null
  readonly hidden?: boolean
  readonly ignoreRestrictions?: boolean
  readonly activitySettings?: ActivitySettings
  readonly code?: string
}

export interface ReloadActivity {
  readonly version?: string
  /** Keys of the exercises to reload, every modified exercise if not defined. */
  readonly exerciseKeys?: string[]
  /**
   * Keys of the modified exercises to reload without destroying the data of the students:
   * only the variables of their sessions are updated, the answers and the grades are kept.
   */
  readonly keepAnswersKeys?: string[]
  /** Rule used to update the variables of the sessions of `keepAnswersKeys`, `unmodified` if not defined. */
  readonly mergeRule?: ExerciseMergeRule
}

/**
 * Rules to update the variables of an exercise session when an exercise is reloaded without destroying its data.
 * - `unmodified`: only the variables that were not changed in the session (by the builder, the grader or the student)
 * are replaced by their new value.
 */
export const EXERCISE_MERGE_RULES = ['unmodified'] as const
export type ExerciseMergeRule = (typeof EXERCISE_MERGE_RULES)[number]

export type ReloadExerciseStatus = 'unchanged' | 'modified' | 'added' | 'removed'

/** Changes of an exercise that can make the answers or the grades of the students inconsistent. */
export type ReloadExerciseRisk = 'builder' | 'grader' | 'files'

export interface ActivityReloadExercise {
  /** Key to give to `ReloadActivity.exerciseKeys` to reload this exercise. */
  readonly key: string
  readonly title: string
  readonly status: ReloadExerciseStatus
  /** Number of students who already answered this exercise. */
  readonly startedCount: number
  /** Names of the variables changed by the new version, for a modified exercise. */
  readonly changedVariables: string[]
  /** Risky changes to show before reloading this exercise while keeping the answers. */
  readonly risks: ReloadExerciseRisk[]
}

export interface ActivityReloadPreview {
  readonly exercises: ActivityReloadExercise[]
  /** The exercises cannot be reloaded separately: any change destroys the data of the whole activity. */
  readonly fullReset: boolean
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
