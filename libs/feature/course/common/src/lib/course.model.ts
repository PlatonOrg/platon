import { ExpandableModel, OrderingDirections } from '@platon/core/common'
import { CoursePermissions } from './permissions.model'
import { CourseStatistic } from './statistic.model'

export type CourseExpandableFields = 'permissions' | 'statistic'

export enum CourseOrderings {
  NAME = 'NAME',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
}

/**
 * Format d'un cours, choisi à la création et figé (non modifiable ensuite).
 * - `CLASSIC` : le cours n'est qu'une compilation d'activités (comportement historique).
 * - `OPENCLASS` : les sections mélangent des leçons (contenu narratif) et des activités,
 *   consultées en lecture séquentielle façon OpenClassrooms.
 */
export enum CourseFormat {
  CLASSIC = 'classic',
  OPENCLASS = 'openclass',
}

export interface Course {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly name: string
  readonly desc?: string
  readonly ownerId: string
  readonly isTest: boolean
  readonly format: CourseFormat

  readonly statistic?: CourseStatistic
  readonly permissions?: CoursePermissions
}

export interface FindCourse extends ExpandableModel<CourseExpandableFields> {
  readonly id: string
}

export interface CreateCourse extends ExpandableModel<CourseExpandableFields> {
  readonly name: string
  readonly code?: string
  readonly desc?: string
  readonly isTest?: boolean
  readonly format?: CourseFormat
}

export interface UpdateCourse extends ExpandableModel<CourseExpandableFields> {
  readonly name?: string
  readonly desc?: string
}

export interface CourseFilters extends ExpandableModel<CourseExpandableFields> {
  readonly search?: string
  readonly members?: string[]
  readonly period?: number
  readonly offset?: number
  readonly limit?: number
  readonly order?: CourseOrderings
  readonly direction?: OrderingDirections
  readonly showAll?: boolean
  readonly isTest?: boolean
  readonly archived?: boolean
}

export const COURSE_ORDERING_DIRECTIONS: Readonly<Record<CourseOrderings, keyof typeof OrderingDirections>> = {
  NAME: 'ASC',
  CREATED_AT: 'DESC',
  UPDATED_AT: 'DESC',
}
