import { ApiProperty } from '@nestjs/swagger'
import { BaseDTO, toArray, toBoolean, toDate, toNumber } from '@platon/core/server'
import { ActivitySettings } from '@platon/feature/compiler'
import {
  Activity,
  ActivityFilters,
  ActivityKind,
  ActivityOpenStates,
  LessonContent,
  ReloadActivity,
  UpdateActivity,
} from '@platon/feature/course/common'
import { Exclude, Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator'
import { ActivityPermissionsDTO } from '../permissions/permissions.dto'
import { RestrictionListDTO } from './activity-restriction.dto'

export class ActivityDTO extends BaseDTO implements Activity {
  @IsUUID()
  @ApiProperty()
  readonly courseId!: string

  @IsUUID()
  @ApiProperty()
  readonly sectionId!: string

  @IsOptional()
  @IsDate()
  readonly openAt?: Date

  @IsOptional()
  @IsDate()
  readonly closeAt?: Date

  @IsOptional()
  @ApiProperty()
  @IsBoolean()
  readonly isChallenge!: boolean

  @IsEnum(ActivityKind)
  @ApiProperty()
  readonly kind!: ActivityKind

  @IsString()
  readonly title!: string

  @IsString()
  readonly resourceId!: string

  @IsString()
  readonly state!: ActivityOpenStates

  @IsNumber()
  @ApiProperty()
  readonly timeSpent = 0

  @IsNumber()
  @ApiProperty()
  readonly progression = 0

  @IsNumber()
  @ApiProperty()
  readonly exerciseCount = 0

  @Type(() => ActivityPermissionsDTO)
  readonly permissions!: ActivityPermissionsDTO

  @IsBoolean()
  @ApiProperty()
  readonly isPeerComparison = false

  @Exclude()
  readonly source?: unknown

  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  readonly ignoreRestrictions?: boolean

  @Type(() => RestrictionListDTO)
  @IsOptional()
  readonly restrictions?: RestrictionListDTO[] | null

  @IsNumber()
  @IsOptional()
  @ApiProperty()
  readonly colorHue?: number

  @Type(() => Object)
  @ApiProperty()
  @IsOptional()
  readonly activitySettings?: ActivitySettings

  @IsString()
  readonly code!: string

  @IsOptional()
  @IsString()
  @ApiProperty()
  readonly lessonTitle?: string

  @IsOptional()
  @IsObject()
  @ApiProperty()
  readonly content?: LessonContent | null

  @IsBoolean()
  @ApiProperty()
  readonly draft!: boolean
}

export class ActivityFiltersDTO implements ActivityFilters {
  @IsOptional()
  @IsUUID()
  @ApiProperty()
  readonly sectionId?: string | null

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @ApiProperty()
  @IsBoolean()
  challenge?: boolean | null
}

export class CreateCourseActivityDTO {
  @IsEnum(ActivityKind)
  @IsOptional()
  @ApiProperty()
  readonly kind: ActivityKind = ActivityKind.EXERCISE

  @IsUUID()
  @ApiProperty()
  readonly sectionId!: string

  // Requis uniquement pour kind === 'exercise' (comportement historique).
  @ValidateIf((o) => o.kind !== ActivityKind.LESSON)
  @IsUUID()
  @ApiProperty()
  readonly resourceId!: string

  @ValidateIf((o) => o.kind !== ActivityKind.LESSON)
  @IsString()
  @ApiProperty()
  readonly resourceVersion!: string

  // Requis uniquement pour kind === 'lesson'.
  @ValidateIf((o) => o.kind === ActivityKind.LESSON)
  @IsString()
  @ApiProperty()
  readonly lessonTitle!: string

  @ValidateIf((o) => o.kind === ActivityKind.LESSON)
  @IsOptional()
  @IsObject()
  @ApiProperty()
  readonly content?: LessonContent

  @ValidateIf((o) => o.kind === ActivityKind.LESSON)
  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  readonly draft?: boolean

  @Transform(({ value }) => toDate(value))
  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly openAt?: Date

  @Transform(({ value }) => toDate(value))
  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly closeAt?: Date

  @Transform(({ value }) => toArray(value))
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty()
  readonly members?: string[]

  @Transform(({ value }) => toArray(value))
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty()
  readonly correctors?: string[]
}

export class UpdateCourseActivityDTO implements UpdateActivity {
  @Transform(({ value }) => toDate(value))
  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly openAt?: Date | null

  @Transform(({ value }) => toDate(value))
  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly closeAt?: Date | null

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  @ApiProperty()
  readonly colorHue?: number | null

  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  readonly ignoreRestrictions?: boolean

  @Type(() => Object)
  @ApiProperty()
  @IsOptional()
  readonly activitySettings?: ActivitySettings

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{6}$/)
  @ApiProperty()
  readonly code?: string

  // kind est volontairement absent : immuable après création.
  @IsOptional()
  @IsString()
  @ApiProperty()
  readonly lessonTitle?: string

  @IsOptional()
  @IsObject()
  @ApiProperty()
  readonly content?: LessonContent

  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  readonly draft?: boolean
}

export class ReloadCourseActivityDTO implements ReloadActivity {
  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly version?: string
}

export class CreateCourseActivitiesBatchDTO {
  @Type(() => CreateCourseActivityDTO)
  @ApiProperty({ type: [CreateCourseActivityDTO] })
  readonly activities!: CreateCourseActivityDTO[]
}
