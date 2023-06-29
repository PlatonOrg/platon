import { ApiProperty } from '@nestjs/swagger';
import { AuthToken } from '@platon/core/common';
import { AuthTokenDTO } from '@platon/core/server';
import {
  CourseDemo,
  CourseDemoAccessAnswer,
} from '@platon/feature/course/common';
import { IsString, IsUUID } from 'class-validator';

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
  uri!: string;
}

export class CourseDemoCreateDTO {
  @IsUUID()
  id!: string;
}

export class CourseDemoAccessAnswerDTO implements CourseDemoAccessAnswer {
  @IsUUID()
  @ApiProperty()
  courseId!: string;

  @IsString()
  readonly accessToken?: string;

  @IsString()
  readonly refreshToken?: string;
}
