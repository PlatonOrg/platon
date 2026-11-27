import { QueryFailedError } from 'typeorm'

/** PostgreSQL code of a unique constraint violation. */
const UNIQUE_VIOLATION = '23505'

/** True if `error` is a PostgreSQL unique violation, optionally restricted to the `constraint` constraint. */
export const isUniqueViolation = (error: unknown, constraint?: string): boolean => {
  if (!(error instanceof QueryFailedError)) return false
  const driverError = error.driverError as { code?: string; constraint?: string } | undefined
  return driverError?.code === UNIQUE_VIOLATION && (!constraint || driverError.constraint === constraint)
}
