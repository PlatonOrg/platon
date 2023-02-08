import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsBoolean, IsDate, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRoles } from './user-roles';

export class UserDTO {
  @IsUUID()
  @ApiProperty()
  readonly id!: string;

  @IsDate()
  @ApiProperty()
  readonly createdAt!: Date;

  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly updatedAt?: Date;

  @IsEnum(UserRoles)
  @ApiProperty({ enum: UserRoles })
  readonly role!: UserRoles;

  @IsString()
  @ApiProperty()
  readonly username!: string;

  @IsBoolean()
  @ApiProperty()
  readonly active!: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly firstName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly lastName?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty()
  readonly email?: string;

  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly lastLogin?: Date;

  @IsDate()
  @IsOptional()
  @ApiProperty()
  readonly firstLogin?: Date;

  @Exclude()
  readonly password?: string;
}

export class UpdateUserDTO {
  @IsOptional()
  @IsEnum(UserRoles)
  @ApiProperty({ enum: UserRoles })
  readonly role?: UserRoles;

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly firstName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  readonly lastName?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty()
  readonly email?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  readonly active?: boolean;
}
