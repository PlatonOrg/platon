import { randomInt } from 'crypto'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ForbiddenResponse, NotFoundResponse, User } from '@platon/core/common'
import { DatabaseService, EventService, IRequest, buildSelectQuery } from '@platon/core/server'
import { ActivityExerciseGroup, ActivitySettings, ActivityVariables, PLSourceFile } from '@platon/feature/compiler'
import {
  ActivityFilters,
  CreateActivity,
  ReloadActivity,
  RestrictionList,
  UpdateActivity,
  calculateActivityOpenState,
} from '@platon/feature/course/common'
import { ResourceEntity, ResourceFileService, ResourceService } from '@platon/feature/resource/server'
import { CLS_REQ } from 'nestjs-cls'
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm'
import { Optional } from 'typescript-optional'
import { ActivityMemberService } from '../activity-member/activity-member.service'
import { ActivityMemberView } from '../activity-member/activity-member.view'
import { CourseNotificationService } from '../course-notification/course-notification.service'
import { ActivityEntity } from './activity.entity'
import {
  ON_CLOSE_ACTIVITY_EVENT,
  ON_RELOAD_ACTIVITY_EVENT,
  ON_REOPEN_ACTIVITY_EVENT,
  OnCloseActivityEventPayload,
  OnReloadActivityEventPayload,
  OnReopenActivityEventPayload,
} from './activity.event'
import { CourseGroupMemberEntity } from '../course-group-member/course-group-member.entity'
import { CourseGroupEntity } from '../course-group/course-group.entity'
import { ActivityGroupEntity } from '../activity-group/activity-group.entity'
import { ActivityGroupService } from '../activity-group/activity-group.service'
import { CourseMemberService } from '../course-member/course-member.service'
import { ActivityDatesService } from './activity-dates.service'

type ActivityGuard = (activity: ActivityEntity) => void | Promise<void>

const ACCESS_CODE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ACCESS_CODE_LENGTH = 6

function generateAccessCode(): string {
  let code = ''
  for (let i = 0; i < ACCESS_CODE_LENGTH; i++) {
    code += ACCESS_CODE_CHARSET[randomInt(ACCESS_CODE_CHARSET.length)]
  }
  return code
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name)

  constructor(
    @Inject(CLS_REQ)
    private readonly request: IRequest,
    private readonly fileService: ResourceFileService,
    private readonly eventService: EventService,
    private readonly databaseService: DatabaseService,
    private readonly notificationService: CourseNotificationService,
    private readonly activityMemberService: ActivityMemberService,
    private readonly courseMemberService: CourseMemberService,
    private readonly activityDatesService: ActivityDatesService,
    @InjectRepository(ActivityEntity)
    private readonly repository: Repository<ActivityEntity>,
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
    @InjectRepository(CourseGroupMemberEntity)
    private readonly courseGroupMemberRepository: Repository<CourseGroupMemberEntity>,
    private readonly activityGroupService: ActivityGroupService,
    private readonly resourceService: ResourceService
  ) {}

  private async canSeeHidden(courseId: string, user?: User): Promise<boolean> {
    return !!user && (await this.courseMemberService.hasWritePermission(courseId, user))
  }

  /** true if activity or section is hidden. */
  async isHidden(activityId: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('activity')
      .leftJoin('activity.section', 'section')
      .where('activity.id = :id', { id: activityId })
      .andWhere('(activity.hidden = true OR section.hidden = true)')
      .getCount()
    return count > 0
  }

  private applyVisibility(qb: SelectQueryBuilder<ActivityEntity>): void {
    // LEFT JOIN if activity without section
    // COALESCE NULL value are set to not hidden
    qb.leftJoin('activity.section', 'section')
      .andWhere('COALESCE(activity.hidden, false) = false')
      .andWhere('COALESCE(section.hidden, false) = false')
  }

  async search(courseId: string, filters?: ActivityFilters): Promise<[ActivityEntity[], number]> {
    const user = this.request.user
    if (!user) {
      throw new ForbiddenResponse('Authentication required')
    }

    const canSeeHidden = await this.canSeeHidden(courseId, user)
    const qb = this.createQueryBuilder(courseId, user, canSeeHidden)

    if (filters?.sectionId) {
      qb.andWhere(`section_id = :sectionId`, { sectionId: filters.sectionId })
    }

    if (filters?.challenge != null) {
      qb.andWhere(`is_challenge = :isChallenge`, { isChallenge: !!filters.challenge })
    }
    if (!canSeeHidden) this.applyVisibility(qb)

    qb.orderBy('activity.createdAt')

    const [entities, count] = await qb.getManyAndCount()

    await this.updateActivitiesDates(entities)
    await this.addVirtualColumns(...entities)

    return [entities, count]
  }

  async findByIdForUser(id: string, user: User): Promise<ActivityEntity> {
    const qb = buildSelectQuery(this.repository.createQueryBuilder('activity'), (qb) =>
      qb.where('activity.id = :id', { id })
    )

    const activity = await qb.getOne()
    if (!activity) {
      throw new NotFoundResponse(`Activity ${id} not found.`)
    }

    // check user role in the course and not his general role on the plateform
    const hasWriteRight =
      user.id === activity.creatorId || (await this.courseMemberService.hasWritePermission(activity.courseId, user))
    if (!hasWriteRight) {
      if (await this.isHidden(id)) throw new NotFoundResponse(`Activity ${id} not found.`)
      const [isPrivateMember, isInGroup, isMember, numGroups] = await Promise.all([
        this.activityMemberService.isPrivateMember(id, user.id),
        this.activityGroupService.isUserInActivityGroup(id, user.id),
        this.activityMemberService.isMember(id, user.id),
        this.activityGroupService.numberOfGroups(id),
      ])
      if (!(isPrivateMember || isInGroup || (isMember && numGroups === 0))) {
        throw new ForbiddenResponse(`You are not a member of this activity`)
      }
    }

    await this.updateActivitiesDates([activity])
    await this.addVirtualColumns(activity)

    return activity
  }

  /** @internal unsafe : don't check if the activity are hidden or the write permission*/
  async findByActivityId(activityId: string): Promise<Optional<ActivityEntity>> {
    const qb = this.repository.createQueryBuilder('activity')
    qb.andWhere(`activity.id = :id`, { id: activityId })

    const activity = await qb.getOne()
    if (activity) {
      await this.updateActivitiesDates([activity])
      await this.addVirtualColumns(activity)
    }
    return Optional.ofNullable(activity)
  }

  /** @internal unsafe : don't check if the activity are hidden or the write permission*/
  async findActivitiesByCourseId(courseId: string): Promise<Optional<ActivityEntity[]>> {
    //without using createQueryBuilder because we need to use the member view and it's not implemented on discord yet.
    const activities = await this.repository.find({
      where: {
        courseId,
      },
    })
    if (activities.length === 0) {
      return Optional.empty()
    }
    return Optional.of(activities)
  }

  async findByCourseId(courseId: string, activityId: string, user?: User): Promise<Optional<ActivityEntity>> {
    if (!user) {
      throw new ForbiddenResponse('Authentication required')
    }

    const canSeeHidden = await this.canSeeHidden(courseId, user)
    const qb = this.createQueryBuilder(courseId, user, canSeeHidden)
    qb.andWhere(`activity.id = :id`, { id: activityId })

    if (!canSeeHidden) this.applyVisibility(qb)

    const activity = await qb.getOne()
    if (!activity) {
      return Optional.empty()
    }

    await this.updateActivitiesDates([activity])

    await this.addVirtualColumns(activity)

    return Optional.of(activity)
  }

  async create(activity: Partial<ActivityEntity>): Promise<ActivityEntity> {
    const order =
      ((await this.repository.maximum('order', { courseId: activity.courseId, sectionId: activity.sectionId })) ?? 0) +
      1
    const result = await this.repository.save({ ...activity, order })
    await this.addVirtualColumns(result)
    return result
  }

  async createActivities(activities: Partial<ActivityEntity>[]): Promise<ActivityEntity[]> {
    if (activities.length === 0) {
      return []
    }

    const maxOrder =
      (await this.repository.maximum('order', {
        courseId: activities[0].courseId,
        sectionId: activities[0].sectionId,
      })) ?? 0
    const activitiesWithOrder = activities.map((activity, index) => ({ ...activity, order: maxOrder + index + 1 }))
    const result = await this.repository.save(activitiesWithOrder)
    await this.addVirtualColumns(...result)
    return result
  }

  async updateActivitesOrder(courseId: string, ids: string[]): Promise<void> {
    const owned = await this.repository.count({ where: { courseId, id: In(ids) } })
    if (owned !== new Set(ids).size) {
      throw new NotFoundResponse('Some activities do not belong to this course')
    }
    const activitiesWithOrder = ids.map((activity, index) => ({ id: activity, order: index }))
    await this.repository.save(activitiesWithOrder)
  }

  async update(
    courseId: string,
    activityId: string,
    changes: Partial<ActivityEntity>,
    guard?: ActivityGuard
  ): Promise<ActivityEntity> {
    const activity = await this.repository.findOne({
      where: {
        courseId,
        id: activityId,
      },
    })

    if (!activity) {
      throw new NotFoundResponse(`CourseActivity not found: ${activityId}`)
    }

    if (guard) {
      await guard(activity)
    }

    const {
      // immuables fields: never read the from request body
      id: _id,
      courseId: _courseId,
      creatorId: _creatorId,

      // Virtual / calulated column should not be persisted
      title: _title,
      state: _state,
      timeSpent: _timeSpent,
      resourceId: _resourceId,
      exerciseCount: _exerciseCount,
      progression: _progression,
      permissions: _permissions,

      activitySettings,
      ...persistedChanges
    } = changes

    if (activitySettings !== undefined) {
      if (!activity.source.variables) {
        activity.source.variables = {} as ActivityVariables
      }
      activity.source.variables.settings = activitySettings
    }

    Object.assign(activity, persistedChanges)

    const result = await this.repository.save(activity)
    await this.addVirtualColumns(result)
    return result
  }

  async updateRestrictions(
    courseId: string,
    activityId: string,
    restrictions: RestrictionList[],
    guard?: ActivityGuard
  ): Promise<ActivityEntity> {
    return this.update(courseId, activityId, { restrictions }, guard)
  }

  async reload(
    courseId: string,
    activityId: string,
    input: ReloadActivity,
    guard?: ActivityGuard
  ): Promise<ActivityEntity> {
    let activity = await this.repository.findOne({
      where: {
        courseId,
        id: activityId,
      },
    })

    if (!activity) {
      throw new NotFoundResponse(`CourseActivity not found: ${activityId}`)
    }

    if (guard) {
      await guard(activity)
    }

    const activitySettings = activity.source.variables.settings as ActivitySettings
    const { source } = await this.fileService.compile({
      resourceId: activity.source.resource,
      version: input.version,
    })
    activity.source = source as PLSourceFile<ActivityVariables>
    activity.source.variables.settings = activitySettings

    activity = await this.repository.save(activity)

    this.eventService.emit<OnReloadActivityEventPayload>(ON_RELOAD_ACTIVITY_EVENT, { activity })

    await this.updateActivitiesDates([activity])
    await this.addVirtualColumns(activity)

    return activity
  }

  async close(courseId: string, activityId: string, guard?: ActivityGuard): Promise<ActivityEntity> {
    const activity = await this.repository.findOne({ where: { courseId, id: activityId } })
    if (!activity) {
      throw new NotFoundResponse(`CourseActivity not found: ${activityId}`)
    }
    if (guard) {
      await guard(activity)
    }

    this.notificationService.notifyActivityBeingClosed(activityId).catch((error) => {
      this.logger.error('Failed to send notification', error)
    })

    await this.activityDatesService.reopenOrCloseAllRestrictions(activity, false)
    this.eventService.emit<OnCloseActivityEventPayload>(ON_CLOSE_ACTIVITY_EVENT, { activityId })
    return this.update(courseId, activityId, { closeAt: new Date(), restrictions: activity.restrictions })
  }

  async reopen(courseId: string, activityId: string, guard?: ActivityGuard): Promise<ActivityEntity> {
    const activity = await this.repository.findOne({ where: { courseId, id: activityId } })
    if (!activity) {
      throw new NotFoundResponse(`CourseActivity not found: ${activityId}`)
    }
    if (guard) {
      await guard(activity)
    }
    await this.activityDatesService.reopenOrCloseAllRestrictions(activity, true)
    this.eventService.emit<OnReopenActivityEventPayload>(ON_REOPEN_ACTIVITY_EVENT, { activityId })
    return this.update(courseId, activityId, { closeAt: null, restrictions: activity.restrictions })
  }

  async regenerateCode(courseId: string, activityId: string, guard?: ActivityGuard): Promise<ActivityEntity> {
    const activity = await this.repository.findOne({ where: { courseId, id: activityId } })
    if (!activity) {
      throw new NotFoundResponse(`CourseActivity not found: ${activityId}`)
    }
    if (guard) {
      await guard(activity)
    }
    return this.update(courseId, activityId, { code: generateAccessCode() })
  }

  async delete(courseId: string, activityId: string, guard?: ActivityGuard) {
    const activity = await this.repository.findOne({
      where: {
        courseId,
        id: activityId,
      },
    })

    if (!activity) {
      throw new NotFoundResponse(`CourseActivity not found: ${activityId}`)
    }

    if (guard) {
      await guard(activity)
    }

    return this.repository.remove(activity)
  }

  async withActivity(
    activityId: string,
    consumer: (activity?: ActivityEntity | null) => void | Promise<void>
  ): Promise<void> {
    const activity = await this.repository.findOne({
      where: {
        id: activityId,
      },
    })
    await consumer(activity)
  }

  async fromInput(input: CreateActivity | UpdateActivity): Promise<ActivityEntity> {
    const activity = new ActivityEntity()

    // don't change DTO object
    const payload: Record<string, unknown> = { ...input }
    const resourceId = payload['resourceId']
    const resourceVersion = payload['resourceVersion'] as string | undefined

    // use to compile the resource
    delete payload['resourceId']
    delete payload['resourceVersion']

    try {
      if (typeof resourceId === 'string' && resourceId.length > 0) {
        const { source } = await this.fileService.compile({
          resourceId,
          version: resourceVersion,
        })
        activity.source = source as PLSourceFile<ActivityVariables>
      }
    } catch (error) {
      if (typeof resourceId === 'string' && resourceId.length > 0) {
        const activityFailure = await this.findByActivityId(resourceId)
        activityFailure.ifPresent((existingActivity) => {
          throw new NotFoundResponse(
            `Resource not found: ${existingActivity.title} version ${String(resourceVersion ?? '')}`
          )
        })

        const resource = await this.resourceService.findByIdOrCode(resourceId)
        resource.ifPresent((existingResource) => {
          throw new NotFoundResponse(`Erreur lord du chargement de l'activité: ${existingResource.name}`)
        })
      }
      throw error
    }

    const { id: _id, courseId: _courseId, creatorId: _creatorId, ...allowed } = payload

    Object.assign(activity, allowed)
    return activity
  }

  private createQueryBuilder(courseId: string, user: User, canSeeAllActivities: boolean) {
    // Role are check from the course role and not the plateform role
    const baseQuery = this.repository.createQueryBuilder('activity')

    if (canSeeAllActivities) {
      return baseQuery.where(`activity.course_id = :courseId`, { courseId })
    }

    return buildSelectQuery(
      baseQuery,
      (qb) => this.withMemberJoin(qb, user),
      (qb) => qb.where(`activity.course_id = :courseId`, { courseId }),
      (qb) => this.withMemberClause(qb, user)
    )
  }

  private async addVirtualColumns(...activities: ActivityEntity[]): Promise<void> {
    const resourceIdOfUntitleActivities = new Set(
      activities
        .filter((activity) => !(activity.source.variables.title as string)?.trim())
        .map((activity) => activity.source.resource as string)
    )

    const resources = resourceIdOfUntitleActivities.size
      ? await this.resourceRepository.find({
          where: {
            id: In(Array.from(resourceIdOfUntitleActivities)),
          },
        })
      : []

    // check right for every activity one time
    const user = this.request.user
    const courseIds = Array.from(new Set(activities.map((activity) => activity.courseId)))
    const writePermissionEntries = await Promise.all(
      courseIds.map(async (courseId) => {
        const canWrite = !!user && (await this.courseMemberService.hasWritePermission(courseId, user))
        return [courseId, canWrite] as const
      })
    )
    const writePermissionByCourse = new Map(writePermissionEntries)

    await Promise.all(
      activities.map(async (activity) => {
        const title = activity.source.variables.title as string
        const exerciseGroups = (activity.source.variables.exerciseGroups as Record<string, ActivityExerciseGroup>) || {}
        const hasWritePermission = writePermissionByCourse.get(activity.courseId) ?? false
        Object.assign(activity, {
          state: calculateActivityOpenState(activity),
          title: title?.trim() || resources.find((r) => r.id === activity.source.resource)?.name,
          resourceId: activity.source.resource,
          exerciseCount: Object.keys(exerciseGroups).reduce(
            (acc, group) => acc + exerciseGroups[group].exercises.length,
            0
          ),
          permissions: {
            answer: true,
            update: hasWritePermission,
            viewStats: hasWritePermission,
            viewResource: hasWritePermission,
          },
          activitySettings: activity.source.variables.settings as ActivitySettings,
        } as Partial<ActivityEntity>)
      })
    )

    await this.databaseService.resolveVirtualColumns(ActivityEntity, activities, this.request.user)
  }

  private withMemberJoin(qb: SelectQueryBuilder<ActivityEntity>, user: User | string) {
    const userId = typeof user === 'string' ? user : user.id
    return qb.leftJoin(ActivityMemberView, 'member', 'member.activity_id = activity.id AND member.id = :userId', {
      userId,
    })
  }

  private withMemberClause(qb: SelectQueryBuilder<ActivityEntity>, user: User | string) {
    const userId = typeof user === 'string' ? user : user.id
    const userGroupsSubQuery = this.createUserGroupSubQuery()
    return qb.andWhere(
      new Brackets((qb) => {
        qb.where('activity.creator_id = :userId', { userId })
          .orWhere('member.member_id IS NOT NULL')
          .orWhere(':userId IN (' + userGroupsSubQuery.getQuery() + ')', {
            userId,
          })
          .orWhere('member.id IS NOT NULL AND NOT EXISTS (' + userGroupsSubQuery.getQuery() + ')')
      })
    )
  }

  private createUserGroupSubQuery(): SelectQueryBuilder<CourseGroupMemberEntity> {
    return this.courseGroupMemberRepository
      .createQueryBuilder('groupMembers')
      .select('groupMembers.user_id')
      .leftJoin(CourseGroupEntity, 'group', 'groupMembers.group_id = group.group_id')
      .leftJoin(ActivityGroupEntity, 'activityGroup', 'group.id = activityGroup.group_id')
      .where('activityGroup.id IS NOT NULL')
      .andWhere('activityGroup.activity_id = activity.id')
  }

  /**
   * Met à jour les dates d'ouverture et de fermeture des activités en fonction des restrictions
   * @param activities Liste des activités à mettre à jour
   */
  async updateActivitiesDates(
    activities: ActivityEntity[]
  ): Promise<{ start: Date | undefined; end: Date | undefined }> {
    return this.activityDatesService.updateActivitiesDates(activities)
  }

  async getCourseColors(courseId: string): Promise<number[]> {
    const activities = await this.repository.find({
      where: { courseId },
    })

    const colorHues = activities
      .map((activity) => activity.colorHue)
      .filter((colorHue): colorHue is number => colorHue !== undefined && colorHue >= 0)

    const colorCount = new Map<number, number>()
    colorHues.forEach((color) => {
      colorCount.set(color, (colorCount.get(color) || 0) + 1)
    })

    return Array.from(colorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color)
  }
}
