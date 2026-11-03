import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { isTeacherRole, UserRoles } from '@platon/core/common'
import { isUniqueViolation, UserEntity, UserService } from '@platon/core/server'
import { Repository } from 'typeorm'
import { LMS_USERS_UNIQUE_INDEX, LmsUserEntity } from './entities/lms-user.entity'

/** Identifies a user in an LMS (LTI 1.1) or a platform (LTI 1.3), which share the same id. */
export interface LmsUserKey {
  ltiPlatformId: string
  lmsUserId: string
}

/** PLaTon account to create on an LMS user's first launch. */
export interface NewLmsUser {
  /** Login in the LMS, kept on the LmsUser (used for CAS matching) */
  lmsUsername?: string
  /** Desired PLaTon username, suffixed if already taken */
  baseUsername: string
  user: Omit<Partial<UserEntity>, 'role'>
}

/** PLaTon accounts of LMS users, shared by LTI 1.1 and LTI 1.3. */
@Injectable()
export class LmsUserService {
  private readonly logger = new Logger(LmsUserService.name)

  constructor(
    @InjectRepository(LmsUserEntity)
    private readonly repository: Repository<LmsUserEntity>,
    private readonly userService: UserService
  ) {}

  /**
   * Finds the PLaTon account of an LMS user, or creates it on their first launch.
   * `role` only promotes an existing account to teacher, never the other way around.
   * `describeNewUser` is only called when the account does not exist yet (it may query the LMS).
   *
   * Two simultaneous first launches (double click, two tabs) create a single account: the unique index
   * `(lti_platform_id, lms_user_id)` makes the second transaction fail, which then reuses the account created by the first.
   */
  async findOrCreate(
    key: LmsUserKey,
    role: UserRoles,
    describeNewUser: () => Promise<NewLmsUser>
  ): Promise<LmsUserEntity> {
    const existing = await this.findByKey(key)
    if (existing) return this.promote(existing, role)

    const newUser = await describeNewUser()
    try {
      return await this.create(key, role, newUser)
    } catch (error) {
      if (!isUniqueViolation(error, LMS_USERS_UNIQUE_INDEX)) throw error
      const winner = await this.findByKey(key)
      if (!winner) throw error
      return this.promote(winner, role)
    }
  }

  private findByKey({ ltiPlatformId, lmsUserId }: LmsUserKey): Promise<LmsUserEntity | null> {
    return this.repository.findOne({ where: { ltiPlatformId, lmsUserId }, relations: ['user'] })
  }

  private async promote(lmsUser: LmsUserEntity, role: UserRoles): Promise<LmsUserEntity> {
    if (!isTeacherRole(lmsUser.user.role) && isTeacherRole(role)) {
      this.logger.log(`Updating role of ${lmsUser.user.username} (${lmsUser.user.id}) to ${role}`)
      lmsUser.user.role = role
      await this.userService.update(lmsUser.user.id, { role })
    }
    return lmsUser
  }

  /** User and LmsUser in the same transaction: if the LmsUser is rejected, the User is not created either. */
  private create(key: LmsUserKey, role: UserRoles, { lmsUsername, baseUsername, user }: NewLmsUser) {
    return this.repository.manager.transaction(async (manager) => {
      const created = await this.userService.createWithAvailableUsername({ ...user, role }, baseUsername, manager)
      const lmsUsers = manager.getRepository(LmsUserEntity)
      return lmsUsers.save(lmsUsers.create({ ...key, username: lmsUsername, userId: created.id, user: created }))
    })
  }
}
