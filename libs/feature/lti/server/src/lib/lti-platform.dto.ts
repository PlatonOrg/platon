import { BaseDTO } from '@platon/core/server'
import {
  CreateLtiPlatform,
  LtiIdTokenValidationMethod,
  LtiPlatform,
  UpdateLtiPlatform,
} from '@platon/feature/lti/common'
import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, IsUrl, ValidateNested } from 'class-validator'
import { LtiPlatformEntity } from './entities/lti-platform.entity'

const VALIDATION_METHODS: LtiIdTokenValidationMethod[] = ['JWK_SET', 'JWK_KEY', 'RSA_KEY']
const URL_OPTIONS = { require_tld: false }

export class LtiIdTokenValidationDTO {
  @IsIn(VALIDATION_METHODS)
  readonly method!: LtiIdTokenValidationMethod

  @IsString()
  readonly key!: string
}

export class LtiPlatformDTO extends BaseDTO implements LtiPlatform {
  readonly name!: string
  readonly url!: string
  readonly clientId!: string
  readonly authenticationEndpoint!: string
  readonly accessTokenEndpoint!: string
  readonly authorizationServer?: string
  readonly idTokenValidation!: LtiIdTokenValidationDTO
  readonly active!: boolean
  readonly publicKey!: string

  /** Builds the DTO explicitly: the entity's private key must never be exposed. */
  static fromEntity(entity: LtiPlatformEntity): LtiPlatformDTO {
    return {
      id: entity.id,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      name: entity.name,
      url: entity.url,
      clientId: entity.clientId,
      authenticationEndpoint: entity.authenticationEndpoint,
      accessTokenEndpoint: entity.accessTokenEndpoint,
      authorizationServer: entity.authorizationServer ?? undefined,
      idTokenValidation: entity.idTokenValidation as LtiIdTokenValidationDTO,
      active: entity.active,
      publicKey: entity.publicKey,
    }
  }
}

export class CreateLtiPlatformDTO implements CreateLtiPlatform {
  @IsUUID()
  @IsOptional()
  readonly lmsId?: string

  @IsString()
  readonly name!: string

  @IsUrl(URL_OPTIONS)
  readonly url!: string

  @IsString()
  readonly clientId!: string

  @IsUrl(URL_OPTIONS)
  readonly authenticationEndpoint!: string

  @IsUrl(URL_OPTIONS)
  readonly accessTokenEndpoint!: string

  @IsUrl(URL_OPTIONS)
  @IsOptional()
  readonly authorizationServer?: string

  @ValidateNested()
  @Type(() => LtiIdTokenValidationDTO)
  readonly idTokenValidation!: LtiIdTokenValidationDTO

  @IsBoolean()
  @IsOptional()
  readonly active?: boolean
}

export class UpdateLtiPlatformDTO implements UpdateLtiPlatform {
  @IsString()
  @IsOptional()
  readonly name?: string

  @IsUrl(URL_OPTIONS)
  @IsOptional()
  readonly url?: string

  @IsString()
  @IsOptional()
  readonly clientId?: string

  @IsUrl(URL_OPTIONS)
  @IsOptional()
  readonly authenticationEndpoint?: string

  @IsUrl(URL_OPTIONS)
  @IsOptional()
  readonly accessTokenEndpoint?: string

  @IsUrl(URL_OPTIONS)
  @IsOptional()
  readonly authorizationServer?: string

  @ValidateNested()
  @Type(() => LtiIdTokenValidationDTO)
  @IsOptional()
  readonly idTokenValidation?: LtiIdTokenValidationDTO

  @IsBoolean()
  @IsOptional()
  readonly active?: boolean
}
