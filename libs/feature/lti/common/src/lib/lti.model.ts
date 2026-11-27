import { OrderingDirections } from '@platon/core/common'

export enum LmsOrdering {
  NAME = 'NAME',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
}

export interface Lms {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly name: string
  readonly url: string
  readonly outcomeUrl: string
  readonly consumerKey: string
  readonly consumerSecret: string
}

export interface CreateLms {
  readonly name: string
  readonly url: string
  readonly outcomeUrl: string
  readonly consumerKey: string
  readonly consumerSecret: string
}

export interface UpdateLms {
  readonly name?: string
  readonly url?: string
  readonly outcomeUrl?: string
  readonly consumerKey?: string
  readonly consumerSecret?: string
}

export interface LmsFilters {
  readonly search?: string
  readonly offset?: number
  readonly limit?: number
  readonly order?: LmsOrdering | keyof typeof LmsOrdering
  readonly direction?: OrderingDirections | keyof typeof OrderingDirections
}

export const LMS_ORDERING_DIRECTIONS: Readonly<Record<LmsOrdering, keyof typeof OrderingDirections>> = {
  NAME: 'ASC',
  CREATED_AT: 'DESC',
  UPDATED_AT: 'DESC',
}

export type LtiIdTokenValidationMethod = 'JWK_SET' | 'JWK_KEY' | 'RSA_KEY'

export interface LtiPlatform {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly name: string
  /** Platform issuer (`iss` field of the id_token) */
  readonly url: string
  readonly clientId: string
  readonly authenticationEndpoint: string
  readonly accessTokenEndpoint: string
  readonly authorizationServer?: string
  readonly idTokenValidation: { readonly method: LtiIdTokenValidationMethod; readonly key: string }
  readonly active: boolean
  /** PLaTon's public key for this platform (exposed on the JWKS URL) */
  readonly publicKey: string
}

export interface CreateLtiPlatform {
  /** Id of an LTI 1.1 LMS to take over: existing accounts and courses stay linked to the platform. */
  readonly lmsId?: string
  readonly name: string
  readonly url: string
  readonly clientId: string
  readonly authenticationEndpoint: string
  readonly accessTokenEndpoint: string
  readonly authorizationServer?: string
  readonly idTokenValidation: { readonly method: LtiIdTokenValidationMethod; readonly key: string }
  readonly active?: boolean
}

export type UpdateLtiPlatform = Partial<Omit<CreateLtiPlatform, 'lmsId'>>

/** Values to enter in the LMS to register PLaTon as an LTI 1.3 tool. */
export interface LtiToolConfig {
  readonly loginUrl: string
  readonly launchUrl: string
  readonly keysetUrl: string
  /** Missing while dynamic registration is disabled (LTI 1.1 -> 1.3 transition). */
  readonly dynamicRegistrationUrl?: string
}
