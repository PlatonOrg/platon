import { OrderingDirections, UserOrderings } from '@platon/core/common'
import { MemberPermissions } from './permissions.model'

export interface ResourceMember {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt?: Date
  readonly waiting?: boolean
  readonly userId: string
  readonly resourceId: string
  readonly permissions: MemberPermissions
}

export interface CreateResourceMember {
  readonly permissions: MemberPermissions
}

export interface UpdateResourceMember {
  readonly waiting?: boolean
  readonly permissions?: MemberPermissions
}

export interface ResourceMemberFilters {
  readonly search?: string
  readonly offset?: number
  readonly limit?: number
  readonly waiting?: boolean
  readonly order?: UserOrderings
  readonly direction?: OrderingDirections
}
