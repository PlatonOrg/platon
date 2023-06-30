import { ApiProperty } from '@nestjs/swagger';
import { AuthToken } from '@platon/core/common';
import { AuthTokenDTO } from '@platon/core/server';
import {
  CourseDemo,
  CourseDemoAccessAnswer,
} from '@platon/feature/course/common';
import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class CourseDemoDTO implements CourseDemo {
  @IsUUID()
  @ApiProperty()
  courseId!: string;

  @IsUUID()
  @ApiProperty()
  uri!: string;
}

export class CourseDemoGetDTO {
  @IsUUID()
  @ApiProperty()
  uri!: string;
}

export class CourseDemoCreateDTO {
  @IsUUID()
  @ApiProperty()
  id!: string;
}

export class CourseDemoAccessAnswerDTO implements CourseDemoAccessAnswer {
  @IsUUID()
  @ApiProperty()
  courseId!: string;

  @IsBoolean()
  @ApiProperty()
  auth!: boolean;

  @IsString()
  @ApiProperty()
  readonly accessToken?: string;

  @IsString()
  @ApiProperty()
  readonly refreshToken?: string;
}
