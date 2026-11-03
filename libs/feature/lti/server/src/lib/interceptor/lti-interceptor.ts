import { SetMetadata } from '@nestjs/common'
import { LmsUserEntity } from '../entities/lms-user.entity'

export const LTI_LAUNCH_INTERCEPTOR = Symbol('LTI_LAUNCH_INTERCEPTOR')

export interface LTILaunchInterceptorArgs {
  lms: {
    id: string
    name: string
  }
  lmsUser: LmsUserEntity
  payload: Record<string, unknown>
  nextUrl: string
}

export interface LTILaunchInterceptor {
  intercept(args: LTILaunchInterceptorArgs): Promise<void>
}

export const RegisterLtiLaunchInterceptor = () => SetMetadata(LTI_LAUNCH_INTERCEPTOR, true)
