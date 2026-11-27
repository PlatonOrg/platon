import { PLSourceFile, Variables } from '@platon/feature/compiler'
import { ExerciseMergeRule, ReloadExerciseRisk } from '@platon/feature/course/common'

/**
 * Sorts the keys of the objects and removes what changes at every compilation, to compare variables.
 */
export const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalize)
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    const output: Record<string, unknown> = {}
    Object.keys(object)
      .sort()
      // The compiler generates a new cid for each component at every compilation.
      .filter((key) => !(key === 'cid' && 'selector' in object))
      .forEach((key) => (output[key] = normalize(object[key])))
    return output
  }
  return value
}

/** Variables that are specific to each session: they are never compared nor merged. */
const SESSION_VARIABLES = ['seed', '.meta']

const isEqual = (a: unknown, b: unknown): boolean => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))

const isComponent = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) && 'selector' in value && 'cid' in value

/**
 * Lists the names of the variables that differ between two compilations of an exercise.
 */
export const changedExerciseVariables = (previous: Variables, next: Variables): string[] =>
  Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]))
    .filter((key) => !SESSION_VARIABLES.includes(key) && !isEqual(previous[key], next[key]))
    .sort()

/**
 * Lists the changes of an exercise that can make the answers or the grades of the students inconsistent
 * if the exercise is reloaded without destroying their data.
 */
export const exerciseReloadRisks = (previous: PLSourceFile, next: PLSourceFile): ReloadExerciseRisk[] => {
  const changed = changedExerciseVariables(previous.variables, next.variables)
  const files = (source: PLSourceFile) =>
    Array.from(new Set((source.dependencies ?? []).map((dependency) => `${dependency.alias ?? ''}:${dependency.hash}`)))
      .sort()
      .join()

  const risks: ReloadExerciseRisk[] = []
  if (changed.includes('builder')) risks.push('builder')
  if (changed.includes('grader')) risks.push('grader')
  if (files(previous) !== files(next)) risks.push('files')
  return risks
}

export interface ExerciseMergeInput {
  /** Names of the variables changed by the new version of the exercise. */
  keys: string[]
  /** Source variables of the session, before the reload. */
  base: Variables
  /** Source variables of the new version of the exercise. */
  next: Variables
  /** Variables of the session, computed by the builder and updated by the answers of the student. */
  current: Variables
}

export interface ExerciseMergeResult {
  variables: Variables
  /** Variables replaced by their new value. */
  updated: string[]
  /** Changed variables that were kept as they were in the session. */
  skipped: string[]
}

type ExerciseMergeFunction = (input: ExerciseMergeInput) => ExerciseMergeResult

const assign = (variables: Variables, key: string, next: Variables, current: Variables): void => {
  if (!(key in next)) {
    delete variables[key]
    return
  }
  // The answers of the student refer to the cid of the components of the session.
  variables[key] =
    isComponent(next[key]) && isComponent(current[key]) ? { ...next[key], cid: current[key]['cid'] } : next[key]
}

const EXERCISE_MERGE_FUNCTIONS: Record<ExerciseMergeRule, ExerciseMergeFunction> = {
  unmodified: ({ keys, base, next, current }) => {
    const variables = { ...current }
    const updated: string[] = []
    const skipped: string[] = []
    keys.forEach((key) => {
      if (!isEqual(current[key], base[key])) {
        skipped.push(key)
        return
      }
      assign(variables, key, next, current)
      updated.push(key)
    })
    return { variables, updated, skipped }
  },
}

/**
 * Updates the variables of an exercise session with the new version of the exercise, without destroying its data.
 */
export const mergeExerciseVariables = (rule: ExerciseMergeRule, input: ExerciseMergeInput): ExerciseMergeResult =>
  EXERCISE_MERGE_FUNCTIONS[rule](input)

/**
 * Updates the source variables of an exercise session with the new version of the exercise.
 * Only the changed variables are replaced: the seed and the variables given by a `next` script are kept.
 */
export const mergeExerciseSourceVariables = (keys: string[], base: Variables, next: Variables): Variables => {
  const variables = { ...base }
  keys.forEach((key) => assign(variables, key, next, base))
  return variables
}
