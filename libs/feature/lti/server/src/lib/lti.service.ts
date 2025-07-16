import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { isTeacherRole, NotFoundResponse, UserRoles } from '@platon/core/common'
import { UserService } from '@platon/core/server'
import { LmsFilters, LmsOrdering, LMS_ORDERING_DIRECTIONS } from '@platon/feature/lti/common'
import { Repository, In } from 'typeorm'
import { Optional } from 'typescript-optional'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsEntity } from './entities/lms.entity'
import { LTILaunchInterceptor, LTILaunchInterceptorArgs, LTI_LAUNCH_INTERCEPTOR } from './interceptor/lti-interceptor'
import { LTIPayload } from './provider/payload'
import { AdminRoles, InstructorRoles, StudentRoles } from './provider/roles'

@Injectable()
export class LTIService {
  private readonly logger = new Logger(LTIService.name)
  private readonly interceptors: LTILaunchInterceptor[] = []

  constructor(
    @InjectRepository(LmsEntity)
    private readonly lmsRepo: Repository<LmsEntity>,
    @InjectRepository(LmsUserEntity)
    private readonly lmsUserRepo: Repository<LmsUserEntity>,
    private readonly userService: UserService,
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

  async deleteLms(id: string) {
    return this.lmsRepo.delete(id)
  }

  async findLmsUserByUsername(username: string, lmses: LmsEntity[] = []): Promise<Optional<LmsUserEntity>> {
    return Optional.ofNullable(
      await this.lmsUserRepo.findOne({
        where: {
          username,
          lmsId: In(lmses.map((lms) => lms.id)),
        },
      })
    )
  }

  private retieveRole(payload: LTIPayload): UserRoles {
    const isAdmin = Object.values(AdminRoles).find((role) => payload.roles.includes(role))
    const isStudent = Object.values(StudentRoles).find((role) => payload.roles.includes(role))
    const isTeacher = Object.values(InstructorRoles).find((role) => payload.roles.includes(role))

    this.logger.log(`[LTI] Analyse des rôles:`, {
      roles: payload.roles,
      isAdmin: !!isAdmin,
      isStudent: !!isStudent,
      isTeacher: !!isTeacher,
      adminRole: isAdmin,
      studentRole: isStudent,
      teacherRole: isTeacher,
    })

    if (isTeacher || isAdmin) {
      return UserRoles.teacher
    } else if (isStudent) {
      return UserRoles.student
    }

    return UserRoles.student
  }

  /**
   * Retrieves or generates an user for the LMS user based on the provided LTI payload.
   * It first checks for the available username fields in the payload, and if none are found,
   * it falls back to using the first character of the first name and the last name.
   *
   * @param {LmsEntity} lms - The LMS entity for which the user's information is being fetched.
   * @param {LTIPayload} payload - The LTI payload containing the user's information.
   * @returns {Promise<LmsUserEntity>} The LMS user based on the provided information.
   */
  async withLmsUser(lms: LmsEntity, payload: LTIPayload): Promise<LmsUserEntity> {
    this.logger.log(`[LTI] Traitement utilisateur LTI pour LMS: ${lms.name} (ID: ${lms.id})`)
    this.logger.log(`[LTI] Payload utilisateur: user_id=${payload.user_id}, roles=${JSON.stringify(payload.roles)}`)

    const existing = await this.lmsUserRepo.findOne({
      where: {
        lmsId: lms.id,
        lmsUserId: payload.user_id + '',
      },
      relations: ['user'],
    })

    this.logger.log(`[LTI] Utilisateur existant trouvé: ${existing ? 'OUI' : 'NON'}`)

    const role: UserRoles = this.retieveRole(payload)
    this.logger.log(`[LTI] Rôle déterminé: ${role}`)

    if (existing) {
      this.logger.log(`[LTI] Utilisateur existant - Rôle actuel: ${existing.user.role}, Nouveau rôle: ${role}`)
      if (!isTeacherRole(existing.user.role) && isTeacherRole(role)) {
        this.logger.log(`[LTI] Mise à jour du rôle de ${existing.user.role} vers ${role}`)
        existing.user.role = role
        await this.userService.update(existing.user.id, { role })
      }
      return existing
    }

    // Détermination du nom d'utilisateur
    const lti_name = payload.ext_user_username || payload.custom_lis_user_username || payload.ext_d2l_username
    this.logger.log(`[LTI] Champs nom d'utilisateur LTI:`, {
      ext_user_username: payload.ext_user_username,
      custom_lis_user_username: payload.custom_lis_user_username,
      ext_d2l_username: payload.ext_d2l_username,
      lti_name_final: lti_name,
    })

    let name = lti_name
    if (!lti_name && payload.lis_person_name_family && payload.lis_person_name_given) {
      name = payload.lis_person_name_given[0].toLowerCase() + '_' + payload.lis_person_name_family.toLowerCase()
      this.logger.log(`[LTI] Nom généré à partir du prénom/nom: ${name}`)
    }

    if (!name) {
      name = 'user'
      this.logger.log(`[LTI] Aucun nom trouvé, utilisation du nom par défaut: ${name}`)
    }

    // Génération d'un nom d'utilisateur unique
    let count = 1
    let username = name
    this.logger.log(`[LTI] Recherche d'un nom d'utilisateur unique, nom de base: ${name}`)

    while ((await this.userService.findByUsername(username)).isPresent()) {
      username = `${name}${count}`
      this.logger.log(
        `[LTI] Nom d'utilisateur ${name}${count === 1 ? '' : count - 1} déjà pris, essai avec: ${username}`
      )
      count++
    }

    this.logger.log(`[LTI] Nom d'utilisateur final: ${username}`)

    // Données pour la création de l'utilisateur
    const userData = {
      email: payload.lis_person_contact_email_primary,
      lastName: payload.lis_person_name_family,
      firstName: payload.lis_person_name_given,
      role,
      username,
    }

    this.logger.log(`[LTI] Création d'un nouvel utilisateur avec les données:`, userData)

    try {
      const user = await this.userService.create(userData)
      this.logger.log(`[LTI] Utilisateur créé avec succès: ID=${user.id}, username=${user.username}`)

      const lmsUserData = {
        userId: user.id,
        lmsId: lms.id,
        lmsUserId: payload.user_id + '',
        username: lti_name || undefined,
        user,
      }

      this.logger.log(`[LTI] Création de l'entité LmsUser avec les données:`, {
        userId: lmsUserData.userId,
        lmsId: lmsUserData.lmsId,
        lmsUserId: lmsUserData.lmsUserId,
        username: lmsUserData.username,
      })

      const lmsUser = await this.lmsUserRepo.save(this.lmsUserRepo.create(lmsUserData))

      this.logger.log(`[LTI] LmsUser créé avec succès: ID=${lmsUser.id}`)
      return lmsUser
    } catch (error) {
      this.logger.error(`[LTI] Erreur lors de la création de l'utilisateur:`, error)
      throw error
    }
  }
}
