export const EXERCISE_BUILDER_DEFAULT_PREFIX = 'Exercice -'

export const EXERCISE_BUILDER_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

export const EXERCISE_BUILDER_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', EXERCISE_BUILDER_DATE_OPTIONS)

export function createExerciseBuilderDefaultName(date = new Date()): string {
  return EXERCISE_BUILDER_DEFAULT_PREFIX + EXERCISE_BUILDER_DATE_FORMATTER.format(date)
}

export function isExerciseBuilderDefaultName(name: string): boolean {
  return name.startsWith(EXERCISE_BUILDER_DEFAULT_PREFIX)
}
