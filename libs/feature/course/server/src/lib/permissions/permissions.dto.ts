import { ApiProperty } from '@nestjs/swagger'
import { ActivityPermissions, CoursePermissions } from '@platon/feature/course/common'
import { IsBoolean } from 'class-validator'

export class ActivityPermissionsDTO implements ActivityPermissions {
  @IsBoolean()
  @ApiProperty()
  readonly update!: boolean
  @IsBoolean()
  @ApiProperty()
  readonly viewStats!: boolean
}

export class CoursePermissionsDTO implements CoursePermissions {
  @IsBoolean()
  @ApiProperty()
  readonly update!: boolean
}
