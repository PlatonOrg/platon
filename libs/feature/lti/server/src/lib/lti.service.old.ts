import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { NotFoundResponse } from '@platon/core/common'
import { LmsFilters, LmsOrdering, LMS_ORDERING_DIRECTIONS } from '@platon/feature/lti/common'
import { Repository, In } from 'typeorm'
import { Optional } from 'typescript-optional'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsEntity } from './entities/lms.entity'
import { LmsUserService } from './lms-user.service'
import { LTILaunchInterceptor, LTILaunchInterceptorArgs, LTI_LAUNCH_INTERCEPTOR } from './interceptor/lti-interceptor'
import { LTIPayload } from './provider/payload'
import { buildBaseUsername, resolveUserRole } from './lti-user.utils'
import { LTI11_TEACHER_ROLES } from './provider/roles.lti11'

@Injectable()
export class LTIOldService {
  private readonly interceptors: LTILaunchInterceptor[] = []

  constructor(
    @InjectRepository(LmsEntity)
    private readonly lmsRepo: Repository<LmsEntity>,
    @InjectRepository(LmsUserEntity)
    private readonly lmsUserRepo: Repository<LmsUserEntity>,
    private readonly lmsUserService: LmsUserService,
    private readonly discovery: DiscoveryService
  ) {}

  async onModuleInit(): Promise<void> {
    const providers = await this.discovery.providersWithMetaAtKey(LTI_LAUNCH_INTERCEPTOR)
    providers.forEach((provider) => {
      this.interceptors.push(provider.discoveredClass.instance as LTILaunchInterceptor)
    })
  }

  async interceptLaunch(args: LTILaunchInterceptorArgs): Promise<void> {
    await Promise.all(this.interceptors.map((interceptor) => interceptor.intercept(args)))
  }

  async findLmsById(id: string): Promise<Optional<LmsEntity>> {
    return Optional.ofNullable(await this.lmsRepo.findOne({ where: { id } }))
  }

  async findLmsByConsumerKey(consumerKey: string): Promise<Optional<LmsEntity>> {
    return Optional.ofNullable(await this.lmsRepo.findOne({ where: { consumerKey } }))
  }

  async searchLMS(filters: LmsFilters = {}): Promise<[LmsEntity[], number]> {
    const query = this.lmsRepo.createQueryBuilder('lms')

    const search = filters.search?.trim()
    if (search) {
      query.andWhere(
        `(
        name ILIKE :search
      )`,
        { search: `%${search}%` }
      )
    }

    if (filters.order) {
      const fields: Record<LmsOrdering, string> = {
        NAME: 'name',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at',
      }

      query.orderBy(fields[filters.order], filters.direction || LMS_ORDERING_DIRECTIONS[filters.order])
    } else {
      query.orderBy('name', 'ASC')
    }

    if (filters.offset) {
      query.offset(filters.offset)
    }

    if (filters.limit) {
      query.limit(filters.limit)
    }

    return query.getManyAndCount()
  }

  async createLms(lms: Partial<LmsEntity>): Promise<LmsEntity> {
    return this.lmsRepo.save(lms)
  }

  async updateLms(id: string, changes: Partial<LmsEntity>): Promise<LmsEntity> {
    const user = (await this.findLmsById(id)).orElseThrow(() => new NotFoundResponse(`Lms not found: ${id}`))
    Object.assign(user, changes)
    return this.lmsRepo.save(user)
  }

  async deleteLms(id: string): Promise<void> {
    const result = await this.lmsRepo.delete(id)
    if (!result.affected) throw new NotFoundResponse(`Lms not found: ${id}`)
  }

  async findLmsUserByUsername(username: string, ltiPlatformIds: string[] = []): Promise<Optional<LmsUserEntity>> {
    if (!ltiPlatformIds.length) return Optional.empty()
    return Optional.ofNullable(
      await this.lmsUserRepo.findOne({
        where: {
          username,
          ltiPlatformId: In(ltiPlatformIds),
        },
      })
    )
  }

  /**
   * Finds or creates the PLaTon account of an LMS user from the LTI 1.1 payload.
   * Username: the LMS login if provided, otherwise first-name initial + "_" + last name (see `buildBaseUsername`).
   */
  withLmsUser(lms: LmsEntity, payload: LTIPayload): Promise<LmsUserEntity> {
    return this.lmsUserService.findOrCreate(
      { ltiPlatformId: lms.id, lmsUserId: payload.user_id + '' },
      resolveUserRole(payload.roles, LTI11_TEACHER_ROLES),
      async () => {
        const lmsUsername =
          payload.ext_user_username || payload.custom_lis_user_username || payload.ext_d2l_username || undefined
        return {
          lmsUsername,
          baseUsername: buildBaseUsername(lmsUsername, payload.lis_person_name_given, payload.lis_person_name_family),
          user: {
            email: payload.lis_person_contact_email_primary,
            lastName: payload.lis_person_name_family,
            firstName: payload.lis_person_name_given,
          },
        }
      }
    )
  }
}
