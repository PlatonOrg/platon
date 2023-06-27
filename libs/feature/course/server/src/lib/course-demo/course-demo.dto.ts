import { ApiProperty } from '@nestjs/swagger';
import { CourseDemo } from '@platon/feature/course/common';
import { IsUUID } from 'class-validator';

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
