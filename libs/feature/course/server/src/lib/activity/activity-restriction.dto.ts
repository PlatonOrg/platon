import { Type, Transform, TypeHelpOptions } from 'class-transformer'
import { IsEnum, IsDate, IsOptional, IsString, ValidateNested, IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { toArray, toDate } from '@platon/core/server'
import { Restriction } from '@platon/feature/course/common'

export enum RestrictionType {
  DateRange = 'DateRange',
  Correctors = 'Correctors',
  Groups = 'Groups',
  Members = 'Members',
  Other = 'Others',
}

export class DateRangeConfigDTO {
  @Transform(({ value }) => toDate(value))
  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly start?: Date

  @Transform(({ value }) => toDate(value))
  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly end?: Date
}

export class MembersConfigDTO {
  @Transform(({ value }) => toArray(value))
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty()
  readonly members?: string[]
}

export class CorrectorsConfigDTO {
  @Transform(({ value }) => toArray(value))
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty()
  readonly correctors?: string[]
}

export class GroupsConfigDTO {
  @Transform(({ value }) => toArray(value))
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty()
  readonly groups?: string[]
}

export class OtherConfigDTO {
  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  readonly enable?: boolean
}

export class RestrictionDTO implements Restriction {
  @IsEnum(RestrictionType)
  @ApiProperty({ enum: RestrictionType })
  readonly type!: RestrictionType

  @ValidateNested()
  @Type((options?: TypeHelpOptions) => {
    if (!options || !options.object) {
      return Object
    }
    const { object } = options
    switch (object['type']) {
      case RestrictionType.DateRange:
        return DateRangeConfigDTO
      case RestrictionType.Members:
        return MembersConfigDTO
      case RestrictionType.Correctors:
        return CorrectorsConfigDTO
      case RestrictionType.Groups:
        return GroupsConfigDTO
      case RestrictionType.Other:
        return OtherConfigDTO
      default:
        return Object
    }
  })
  @ApiProperty()
  readonly config!:
    | { start: Date | undefined; end: Date | undefined }
    | { members?: string[] }
    | { correctors?: string[] }
    | { groups?: string[] }
    | { enabled?: boolean }
}

export class RestrictionListDTO {
  @ValidateNested({ each: true })
  @Type(() => RestrictionDTO)
  @ApiProperty({ type: () => [RestrictionDTO] })
  readonly restriction!: Restriction[]
}
