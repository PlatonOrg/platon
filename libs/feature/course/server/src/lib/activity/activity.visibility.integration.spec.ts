import { NotFoundResponse, UserRoles } from '@platon/core/common'
import { DatabaseService, EventService, UserEntity, UserGroupEntity } from '@platon/core/server'
import { TestDatabase, createTestDatabase } from '@platon/core/testing/server'
import { DataSource, Repository } from 'typeorm'
import { ActivityGroupEntity } from '../activity-group/activity-group.entity'
import { ActivityMemberView } from '../activity-member/activity-member.view'
import { CourseGroupMemberEntity } from '../course-group-member/course-group-member.entity'
import { CourseGroupEntity } from '../course-group/course-group.entity'
import { CourseMemberEntity } from '../course-member/course-member.entity'
import { CourseEntity } from '../entites/course.entity'
import { CourseSectionEntity } from '../section/section.entity'
import { ActivityEntity } from './activity.entity'
import { ActivityService } from './activity.service'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ResourceFileService, ResourceEntity, ResourceService } from '@platon/feature/resource/server'
import { CLS_REQ } from 'nestjs-cls'
import { ActivityGroupService } from '../activity-group/activity-group.service'
import { ActivityMemberService } from '../activity-member/activity-member.service'
import { CourseMemberService } from '../course-member/course-member.service'
import { CourseNotificationService } from '../course-notification/course-notification.service'
import { ActivityDatesService } from './activity-dates.service'
import { ActivityMemberEntity } from '../activity-member/activity-member.entity'

describe('ActivityService : activités et sections cachées (intégration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let courseRepo: Repository<CourseEntity>
  let memberRepo: Repository<CourseMemberEntity>
  let sectionRepo: Repository<CourseSectionEntity>
  let activityRepo: Repository<ActivityEntity>

  let service: ActivityService
  const request = { user: undefined as UserEntity | undefined }
  const courseMemberService = { hasWritePermission: jest.fn() }
  let moduleRef: TestingModule

  beforeAll(async () => {
    testDb = await createTestDatabase([
      UserEntity,
      UserGroupEntity,
      CourseEntity,
      CourseMemberEntity,
      CourseGroupEntity,
      CourseGroupMemberEntity,
      CourseSectionEntity,
      ActivityEntity,
      ActivityMemberEntity,
      ActivityGroupEntity,
      ActivityMemberView,
    ])
    dataSource = testDb.dataSource

    userRepo = dataSource.getRepository(UserEntity)
    courseRepo = dataSource.getRepository(CourseEntity)
    memberRepo = dataSource.getRepository(CourseMemberEntity)
    sectionRepo = dataSource.getRepository(CourseSectionEntity)
    activityRepo = dataSource.getRepository(ActivityEntity)

    const fileService = {
      compile: jest.fn(),
    }

    const eventService = {
      emit: jest.fn(),
    }

    const databaseService = {
      resolveVirtualColumns: jest.fn().mockResolvedValue(undefined),
    }

    const notificationService = {
      notifyActivityBeingClosed: jest.fn().mockResolvedValue(undefined),
    }

    const activityMemberService = {
      isPrivateMember: jest.fn(),
      isMember: jest.fn(),
    }

    const activityDatesService = {
      updateActivitiesDates: jest.fn().mockResolvedValue(undefined),
    }

    const activityGroupService = {
      isUserInActivityGroup: jest.fn(),
      numberOfGroups: jest.fn(),
    }

    const resourceService = {
      findByIdOrCode: jest.fn(),
    }

    const resourceRepository = {
      find: jest.fn().mockResolvedValue([]),
    }

    moduleRef = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: CLS_REQ, useValue: request },
        { provide: ResourceFileService, useValue: fileService },
        { provide: EventService, useValue: eventService },
        { provide: DatabaseService, useValue: databaseService },
        { provide: CourseNotificationService, useValue: notificationService },
        { provide: ActivityMemberService, useValue: activityMemberService },
        { provide: CourseMemberService, useValue: courseMemberService },
        { provide: ActivityDatesService, useValue: activityDatesService },
        {
          provide: getRepositoryToken(ActivityEntity),
          useValue: dataSource.getRepository(ActivityEntity),
        },
        {
          provide: getRepositoryToken(ResourceEntity),
          useValue: resourceRepository,
        },
        {
          provide: getRepositoryToken(CourseGroupMemberEntity),
          useValue: dataSource.getRepository(CourseGroupMemberEntity),
        },
        { provide: ActivityGroupService, useValue: activityGroupService },
        { provide: ResourceService, useValue: resourceService },
      ],
    }).compile()

    service = moduleRef.get(ActivityService)
  }, 60_000)

  afterAll(async () => {
    await moduleRef.close()
    await testDb.teardown()
  })

  beforeEach(() => {
    request.user = undefined
    courseMemberService.hasWritePermission.mockResolvedValue(false)
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await dataSource.query('TRUNCATE "Activities","CourseSections","CourseMembers","Courses","Users" CASCADE')
  })

  /** Create the course with activities, members and section.
   * For the activities :
   *  A: visible / section visible   B: hidden / section visible
   *  C: visible / section hidden    D: hidden / section hidden
   *
   * @return { course, student, teacher, ids: { A, B, C, D } }
   * A,B,C,D are the activities Id.
   */
  const seed = async () => {
    const studentToSave = userRepo.create({
      username: `activity-visibility-integration-user-student`,
      firstName: 'Test',
      lastName: 'User',
      email: `activity-visibility-integration-user-student@test.local`,
      role: UserRoles.student,
      active: true,
      lastActivity: new Date(),
    })
    const teacherToSave = userRepo.create({
      username: `activity-visibility-integration-user-teacher`,
      firstName: 'Test',
      lastName: 'User',
      email: `activity-visibility-integration-user-teacher@test.local`,
      role: UserRoles.teacher,
      active: true,
      lastActivity: new Date(),
    })

    const [student, teacher] = await userRepo.save([studentToSave, teacherToSave])

    const course = await courseRepo.save(courseRepo.create({ name: 'My course', ownerId: teacher?.id }))

    const [visibleSection, hiddenSection] = await sectionRepo.save([
      sectionRepo.create({ courseId: course.id, name: 'Section visible', order: 0, hidden: false }),
      sectionRepo.create({ courseId: course.id, name: 'Section hidden', order: 1, hidden: true }),
    ])

    await memberRepo.save([
      memberRepo.create({ courseId: course.id, userId: student?.id, role: CourseMemberRoles.student }),
      memberRepo.create({ courseId: course.id, userId: teacher?.id, role: CourseMemberRoles.teacher }),
    ])

    const [A, B, C, D] = await activityRepo.save([
      activityRepo.create({
        courseId: course.id,
        sectionId: visibleSection.id,
        creatorId: teacher.id,
        source: { variables: { title: 'A' } } as never,
        hidden: false,
      }),
      activityRepo.create({
        courseId: course.id,
        sectionId: visibleSection.id,
        creatorId: teacher.id,
        source: { variables: { title: 'B' } } as never,
        hidden: true,
      }),
      activityRepo.create({
        courseId: course.id,
        sectionId: hiddenSection.id,
        creatorId: teacher.id,
        source: { variables: { title: 'C' } } as never,
        hidden: false,
      }),
      activityRepo.create({
        courseId: course.id,
        sectionId: hiddenSection.id,
        creatorId: teacher.id,
        source: { variables: { title: 'D' } } as never,
        hidden: true,
      }),
    ])
    const ids = {
      A: A.id,
      B: B.id,
      C: C.id,
      D: D.id,
    }
    return { course, student, teacher, ids }
  }

  it('search : un étudiant ne voit que A, alors qu’il est membre des quatre', async () => {
    const { course, student, ids } = await seed()
    request.user = student
    courseMemberService.hasWritePermission.mockResolvedValue(false)

    const [items, total] = await service.search(course.id)

    expect(items.map((a) => a.id)).toEqual([ids.A])
    expect(total).toBe(1)
  })

  it("search : un utilisateur avec droit d'écriture voit les quatre", async () => {
    const { course, teacher } = await seed()
    request.user = teacher
    courseMemberService.hasWritePermission.mockResolvedValue(true)

    expect((await service.search(course.id))[1]).toBe(4)
  })

  it.each(['B', 'C', 'D'] as const)('findByCourseId : %s est introuvable pour un étudiant', async (key) => {
    const { course, student, ids } = await seed()
    request.user = student
    courseMemberService.hasWritePermission.mockResolvedValue(false)

    expect((await service.findByCourseId(course.id, ids[key], student)).isEmpty()).toBe(true)
  })

  it.each([
    ['A', false],
    ['B', true],
    ['C', true],
    ['D', true],
  ] as const)('isHidden(%s) = %s', async (key, expected) => {
    const { ids } = await seed()
    await expect(service.isHidden(ids[key])).resolves.toBe(expected)
  })

  it('isHidden renvoie false pour un id inconnu (l’appelant doit vérifier l’existence)', async () => {
    await expect(service.isHidden('00000000-0000-0000-0000-000000000000')).resolves.toBe(false)
  })

  it('cacher une section masque ses activités', async () => {
    const { course, student, ids } = await seed()
    request.user = student
    courseMemberService.hasWritePermission.mockResolvedValue(false)
    await dataSource.getRepository(CourseSectionEntity).update({ courseId: course.id }, { hidden: true })

    expect((await service.search(course.id))[1]).toBe(0)
    await expect(service.findByIdForUser(ids.A, student)).rejects.toBeInstanceOf(NotFoundResponse)
  })
})
