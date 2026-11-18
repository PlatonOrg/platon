import { UserRoles } from '@platon/core/common'

/** PLaTon role of an LTI user: teacher if they have at least one of `teacherRoles`, student otherwise. */
export const resolveUserRole = (ltiRoles: readonly string[], teacherRoles: readonly string[]): UserRoles =>
  ltiRoles.some((role) => teacherRoles.includes(role)) ? UserRoles.teacher : UserRoles.student

/**
 * PLaTon username to suggest for a new LTI user (same convention in LTI 1.1 and 1.3):
 * the LMS login if known, otherwise first-name initial + "_" + last name, otherwise "user".
 */
export const buildBaseUsername = (lmsUsername?: string, givenName?: string, familyName?: string): string => {
  if (lmsUsername) return lmsUsername
  if (givenName && familyName) return givenName[0].toLowerCase() + '_' + familyName.toLowerCase()
  return 'user'
}

/**
 * Value of an LTI custom parameter, or undefined if it is missing, empty or not substituted:
 * Moodle sends the variable as is (`$User.username`, `$Moodle.Person.userGroupIds`) when it cannot replace it.
 */
export const readCustomParam = (custom: Record<string, unknown> | undefined, name: string): string | undefined => {
  const value = custom?.[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed && !trimmed.startsWith('$') ? trimmed : undefined
}
