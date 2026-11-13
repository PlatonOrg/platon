import { createHash } from 'crypto'
import { deepCopy } from '@platon/core/common'
import {
  ActivityExercise,
  ActivityExerciseGroups,
  ActivityVariables,
  PLSourceFile,
  extractExercisesFromActivityVariables,
} from '@platon/feature/compiler'
import { ReloadExerciseStatus } from '@platon/feature/course/common'
import { changedExerciseVariables, normalize } from './exercise-merge'

export interface ExerciseDiff {
  /** Stable identifier of the exercise between a preview and a reload. */
  key: string
  status: ReloadExerciseStatus
  previous?: ActivityExercise
  next?: ActivityExercise
}

export interface ActivityReloadPlan {
  variables: ActivityVariables
  /** Exercises whose content is replaced: their data must be destroyed. */
  resetExerciseIds: string[]
  /** Exercises removed from the activity: their data must be destroyed. */
  removedExerciseIds: string[]
  /** Exercises whose content is replaced while keeping the data: only the given variables must be updated. */
  patchedExercises: PatchedExercise[]
}

export interface PatchedExercise {
  id: string
  /** Names of the variables changed by the new version. */
  variables: string[]
}

/**
 * Computes a hash of the content of a compiled exercise.
 *
 * It ignores what changes at every compilation (cid), what is drawn for each student (seed)
 * and the version (a new version with the same content is not a modification).
 */
export const exerciseFingerprint = (source: PLSourceFile): string => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { seed, '.meta': meta, ...variables } = source.variables
  const dependencies = (source.dependencies ?? []).map((dependency) => `${dependency.alias ?? ''}:${dependency.hash}`)
  return createHash('sha1')
    .update(JSON.stringify(normalize({ variables, dependencies: Array.from(new Set(dependencies)).sort() })))
    .digest('hex')
}

const compiledExercises = (variables: ActivityVariables): ActivityExercise[] =>
  extractExercisesFromActivityVariables(variables).filter((exercise) => exercise.source)

/**
 * Compares the exercises of two compilations of an activity.
 *
 * The compiler generates new exercise ids at every compilation, so exercises are matched by resource:
 * first with the ones having the same content, then in order of appearance.
 */
export const diffActivityExercises = (previous: ActivityVariables, next: ActivityVariables): ExerciseDiff[] => {
  const pool = compiledExercises(previous).map((exercise) => ({
    exercise,
    fingerprint: exerciseFingerprint(exercise.source),
  }))
  const take = (predicate: (item: (typeof pool)[number]) => boolean): ActivityExercise | undefined => {
    const index = pool.findIndex(predicate)
    return index === -1 ? undefined : pool.splice(index, 1)[0].exercise
  }

  const exercises = compiledExercises(next)
  const unchanged = exercises.map((exercise) => {
    const fingerprint = exerciseFingerprint(exercise.source)
    return take((item) => item.exercise.resource === exercise.resource && item.fingerprint === fingerprint)
  })

  const occurrences: Record<string, number> = {}
  const diffs = exercises.map((exercise, index): ExerciseDiff => {
    if (unchanged[index]) {
      return { key: unchanged[index].id, status: 'unchanged', previous: unchanged[index], next: exercise }
    }
    const modified = take((item) => item.exercise.resource === exercise.resource)
    if (modified) {
      return { key: modified.id, status: 'modified', previous: modified, next: exercise }
    }
    occurrences[exercise.resource] = (occurrences[exercise.resource] ?? 0) + 1
    return { key: `added:${exercise.resource}:${occurrences[exercise.resource]}`, status: 'added', next: exercise }
  })

  return diffs.concat(
    pool.map(({ exercise }): ExerciseDiff => ({ key: exercise.id, status: 'removed', previous: exercise }))
  )
}

/**
 * Builds the variables of the reloaded activity.
 *
 * Everything comes from the new compilation, except the exercises that are not selected, which stay as they were.
 * @param exerciseKeys Keys of the exercises to reload, every modified exercise if not defined.
 * @param keepAnswersKeys Keys of the reloaded modified exercises whose data must be kept.
 */
export const planActivityReload = (
  previous: ActivityVariables,
  next: ActivityVariables,
  exerciseKeys?: string[],
  keepAnswersKeys: string[] = []
): ActivityReloadPlan => {
  const diffs = diffActivityExercises(previous, next)
  const isSelected = (diff: ExerciseDiff) => !exerciseKeys || exerciseKeys.includes(diff.key)
  const byNext = new Map(diffs.filter((diff) => diff.next).map((diff) => [diff.next, diff]))

  const variables = { ...next, exerciseGroups: {} as ActivityExerciseGroups }
  const resetExerciseIds: string[] = []
  const removedExerciseIds: string[] = []
  const patchedExercises: PatchedExercise[] = []

  Object.entries(next.exerciseGroups || {}).forEach(([groupId, group]) => {
    const exercises: ActivityExercise[] = []
    group.exercises.forEach((exercise) => {
      const diff = byNext.get(exercise)
      if (!diff) {
        exercises.push(exercise)
      } else if (diff.status === 'added') {
        if (isSelected(diff)) exercises.push(exercise)
      } else if (diff.status === 'unchanged' || isSelected(diff)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        exercises.push({ ...exercise, id: diff.previous!.id })
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const previousExercise = diff.previous!
        if (diff.status === 'modified' && keepAnswersKeys.includes(diff.key)) {
          patchedExercises.push({
            id: previousExercise.id,
            variables: changedExerciseVariables(previousExercise.source.variables, exercise.source.variables),
          })
        } else if (diff.status === 'modified') {
          resetExerciseIds.push(previousExercise.id)
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        exercises.push({ ...diff.previous!, groupId: exercise.groupId })
      }
    })
    variables.exerciseGroups[groupId] = { ...group, exercises }
  })

  diffs
    .filter((diff) => diff.status === 'removed')
    .forEach((diff) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const exercise = diff.previous!
      if (isSelected(diff)) {
        removedExerciseIds.push(exercise.id)
        return
      }
      const groupId = String(exercise.groupId)
      variables.exerciseGroups[groupId] = variables.exerciseGroups[groupId] ?? {
        ...deepCopy(previous.exerciseGroups[groupId]),
        exercises: [],
      }
      variables.exerciseGroups[groupId].exercises.push(exercise)
    })

  return { variables, resetExerciseIds, removedExerciseIds, patchedExercises }
}
