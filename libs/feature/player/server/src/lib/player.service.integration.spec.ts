/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataSource, In, Repository } from 'typeorm'
import { UserEntity } from '@platon/core/server'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import { ActivityEntity, ActivityService } from '@platon/feature/course/server'
import { CourseEntity } from '@platon/feature/course/server'
import { CourseSectionEntity } from '@platon/feature/course/server'
import { AnswerEntity, CorrectionEntity, SessionEntity } from '@platon/feature/result/server'
// Non exportée publiquement mais nécessaire car SessionEntity a une @OneToMany vers elle
import { StudentSubmissionEntity } from '@platon/feature/result/server' //'../../../../result/server/src/lib/submissions/submission.entity'
import { UserRoles } from '@platon/core/common'
import { PlayerService } from './player.service'

describe('PlayerService (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let userRepo: Repository<UserEntity>
  let courseRepo: Repository<CourseEntity>
  let sectionRepo: Repository<CourseSectionEntity>
  let activityRepo: Repository<ActivityEntity>
  let sessionRepo: Repository<SessionEntity>
  let service: PlayerService

  const mockDeps = {
    eventService: { emit: jest.fn() },
    sandboxService: { build: jest.fn(), buildNext: jest.fn(), downloadEnvironment: jest.fn(), run: jest.fn() },
    answerService: { create: jest.fn(), findAllOfSession: jest.fn(), findGradesOfSession: jest.fn() },
    sessionService: {
      findById: jest.fn(),
      findUserActivity: jest.fn(),
      create: jest.fn(),
      linkDependencies: jest.fn(),
      update: jest.fn(),
      findAllWithParent: jest.fn(),
      findExerciseSessionById: jest.fn(),
      findExerciseSessionByActivityId: jest.fn(),
    },
    activityService: { findByIdForUser: jest.fn(), updateActivitiesDates: jest.fn() },
    resourceFileService: { compile: jest.fn(), getTitle: jest.fn() },
    peerService: { getNextCopy: jest.fn(), createMatch: jest.fn(), resolveGame: jest.fn() },
    courseNotificationService: { notifyModerationActivityChanges: jest.fn(), notifyExerciseChanges: jest.fn() },
  }

  beforeAll(async () => {
    testDb = await createTestDatabase([
      UserEntity,
      CourseEntity,
      CourseSectionEntity,
      ActivityEntity,
      CorrectionEntity,
      SessionEntity,
      AnswerEntity,
      StudentSubmissionEntity,
    ])
    dataSource = testDb.dataSource
    userRepo = dataSource.getRepository(UserEntity)
    courseRepo = dataSource.getRepository(CourseEntity)
    sectionRepo = dataSource.getRepository(CourseSectionEntity)
    activityRepo = dataSource.getRepository(ActivityEntity)
    sessionRepo = dataSource.getRepository(SessionEntity)

    service = new PlayerService(
      dataSource,
      mockDeps.eventService as any,
      mockDeps.sandboxService as any,
      mockDeps.answerService as any,
      mockDeps.sessionService as any,
      mockDeps.activityService as any,
      mockDeps.resourceFileService as any,
      mockDeps.peerService as any,
      mockDeps.courseNotificationService as any
    )
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "Sessions" CASCADE')
    await dataSource.query('TRUNCATE "Activities" CASCADE')
    await dataSource.query('TRUNCATE "CourseSections" CASCADE')
    await dataSource.query('TRUNCATE "Courses" CASCADE')
    await dataSource.query('TRUNCATE "Users" CASCADE')
  })

  // ─── helpers ──────────────────────────────────────────────────────────────

  const seedUser = async (): Promise<UserEntity> => {
    const user = userRepo.create({
      username: 'player-integration-user',
      firstName: 'Max',
      lastName: 'Tekpa',
      email: 'tekpa@integration.test',
      role: UserRoles.teacher,
      active: true,
      lastActivity: new Date(),
    })
    return userRepo.save(user)
  }

  const seedActivity = async (userId: string): Promise<ActivityEntity> => {
    const course = await courseRepo.save(courseRepo.create({ name: 'Test Course', ownerId: userId }))
    const section = await sectionRepo.save(sectionRepo.create({ name: 'Section 1', order: 0, courseId: course.id }))
    return activityRepo.save(
      activityRepo.create({
        creatorId: userId,
        courseId: course.id,
        sectionId: section.id,
        source: {
          abspath: '/test/activity.pla',
          variables: {} as any,
          dependencies: [],
        },
        ignoreRestrictions: true,
      })
    )
  }

  const seedSession = async (activityId: string, userId: string): Promise<SessionEntity> => {
    return sessionRepo.save(
      sessionRepo.create({
        activityId,
        userId,
        variables: {} as any,
        grade: -1,
        attempts: 0,
        isBuilt: false,
        source: {
          abspath: '/test/exercise.ple',
          variables: {} as any,
          dependencies: [],
        },
      })
    )
  }

  // ─── onReloadActivity ─────────────────────────────────────────────────────

  describe('onReloadActivity', () => {
    describe('with changes', () => {
      const compiled = (title: string) => ({ abspath: '/test/main.ple', dependencies: [], variables: { title } } as any)
      const exercise = (id: string, title: string) => ({
        id,
        groupId: 0,
        resource: id,
        version: 'latest',
        source: compiled(title),
      })
      const groups = (...exercises: unknown[]) => ({ 0: { name: 'g', grader: { type: 'empty' }, exercises } })

      const seedStudent = async (activity: ActivityEntity, userId: string) => {
        const child = (grade: number, attempts: number, title: string) =>
          sessionRepo.save(
            sessionRepo.create({
              activityId: activity.id,
              userId,
              variables: { title } as any,
              grade,
              attempts,
              isBuilt: true,
              source: compiled(title),
            })
          )
        const parent = await sessionRepo.save(
          sessionRepo.create({
            activityId: activity.id,
            userId,
            grade: 75,
            attempts: 2,
            isBuilt: true,
            source: compiled('old'),
            variables: {} as any,
          })
        )
        const [kept, reset, gone] = [await child(100, 1, 'A'), await child(50, 1, 'B'), await child(-1, 0, 'C')]
        await sessionRepo.update({ id: In([kept.id, reset.id, gone.id]) }, { parentId: parent.id })
        await sessionRepo.update(
          { id: parent.id },
          {
            variables: {
              title: 'old',
              settings: {},
              exerciseGroups: groups(exercise('kept', 'A'), exercise('reset', 'B'), exercise('gone', 'C')),
              navigation: {
                started: true,
                terminated: true,
                current: { id: 'reset', title: 'B', state: 'FAILED', sessionId: reset.id },
                exercises: [
                  { id: 'kept', title: 'A', state: 'SUCCEEDED', grade: 100, sessionId: kept.id, groupId: 0 },
                  { id: 'reset', title: 'B', state: 'FAILED', grade: 50, sessionId: reset.id, groupId: 0 },
                  { id: 'gone', title: 'C', state: 'NOT_STARTED', sessionId: gone.id, groupId: 0 },
                ],
              },
            } as any,
          }
        )
        return { parent, kept, reset, gone }
      }

      beforeEach(() => {
        mockDeps.resourceFileService.getTitle.mockResolvedValue('Nouveau')
        mockDeps.sessionService.create.mockImplementation((input: any, manager: any) =>
          manager.save(SessionEntity, manager.create(SessionEntity, input))
        )
        mockDeps.sessionService.update.mockImplementation((id: string, changes: any, manager?: any) =>
          (manager ?? dataSource.manager).update(SessionEntity, { id }, changes)
        )
      })

      it('should destroy only the data of the changed exercises', async () => {
        const user = await seedUser()
        const activity = await seedActivity(user.id)
        const student = await seedStudent(activity, user.id)
        const answers = dataSource.getRepository(AnswerEntity)
        const answer = await answers.save({
          sessionId: student.kept.id,
          userId: user.id,
          variables: {} as any,
          grade: 100,
        })
        const lostAnswer = await answers.save({
          sessionId: student.reset.id,
          userId: user.id,
          variables: {} as any,
          grade: 50,
        })

        activity.source = {
          ...compiled('new'),
          variables: {
            title: 'new',
            settings: {},
            exerciseGroups: groups(exercise('reset', 'B2'), exercise('kept', 'A'), exercise('added', 'D')),
          },
        }
        await (service as any).onReloadActivity({
          activity,
          changes: { resetExerciseIds: ['reset'], removedExerciseIds: ['gone'] },
        })

        expect(await sessionRepo.countBy({ id: student.kept.id })).toEqual(1)
        expect(await sessionRepo.countBy({ id: In([student.reset.id, student.gone.id]) })).toEqual(0)
        expect(await answers.findOneBy({ id: answer.id })).not.toBeNull()
        expect(await answers.findOneBy({ id: lostAnswer.id })).toBeNull()

        const parent = (await sessionRepo.findOneByOrFail({ id: student.parent.id })) as any
        const navigation = parent.variables.navigation
        expect(parent.variables.title).toEqual('new')
        expect(navigation.exercises.map((item: any) => item.id)).toEqual(['reset', 'kept', 'added'])
        expect(navigation.terminated).toBe(false)

        const [reset, kept, added] = navigation.exercises
        expect(kept).toMatchObject({ state: 'SUCCEEDED', grade: 100, sessionId: student.kept.id })
        expect(reset).toMatchObject({ state: 'NOT_STARTED' })
        expect(reset.sessionId).not.toEqual(student.reset.id)
        expect(navigation.current.sessionId).toEqual(reset.sessionId)
        for (const item of [reset, added]) {
          const session = await sessionRepo.findOneByOrFail({ id: item.sessionId })
          expect(session.parentId).toEqual(parent.id)
          expect(session.isBuilt).toBe(false)
        }
        expect((await sessionRepo.findOneByOrFail({ id: reset.sessionId })).source.variables).toMatchObject({
          title: 'B2',
        })

        // 100 for the kept exercise, divided by the 3 remaining exercises.
        expect(parent.grade).toEqual(33.33)
        expect(parent.attempts).toEqual(1)
      })

      it('should keep everything when no exercise changed', async () => {
        const user = await seedUser()
        const activity = await seedActivity(user.id)
        const student = await seedStudent(activity, user.id)

        activity.source = {
          ...compiled('new'),
          variables: {
            title: 'new',
            settings: {},
            exerciseGroups: groups(exercise('kept', 'A'), exercise('reset', 'B'), exercise('gone', 'C')),
          },
        }
        await (service as any).onReloadActivity({
          activity,
          changes: { resetExerciseIds: [], removedExerciseIds: [] },
        })

        const parent = (await sessionRepo.findOneByOrFail({ id: student.parent.id })) as any
        expect(parent.variables.title).toEqual('new')
        expect(parent.variables.navigation.terminated).toBe(true)
        expect(parent.grade).toEqual(75)
        expect(await sessionRepo.countBy({ parentId: parent.id })).toEqual(3)
      })

      it('should reopen the activity and update the grade when an exercise is only added', async () => {
        const user = await seedUser()
        const activity = await seedActivity(user.id)
        const student = await seedStudent(activity, user.id)

        activity.source = {
          ...compiled('new'),
          variables: {
            title: 'new',
            settings: {},
            exerciseGroups: groups(
              exercise('kept', 'A'),
              exercise('reset', 'B'),
              exercise('gone', 'C'),
              exercise('added', 'D')
            ),
          },
        }
        await (service as any).onReloadActivity({
          activity,
          changes: { resetExerciseIds: [], removedExerciseIds: [] },
        })

        const parent = (await sessionRepo.findOneByOrFail({ id: student.parent.id })) as any
        expect(parent.variables.navigation.exercises.map((item: any) => item.id)).toEqual([
          'kept',
          'reset',
          'gone',
          'added',
        ])
        expect(parent.variables.navigation.terminated).toBe(false)
        // 100 + 50 for the answered exercises, divided by the 4 exercises.
        expect(parent.grade).toEqual(37.5)
        expect(await sessionRepo.countBy({ parentId: parent.id })).toEqual(4)
      })

      it('should use the grade of the teacher corrections when computing the grade', async () => {
        const user = await seedUser()
        const activity = await seedActivity(user.id)
        const student = await seedStudent(activity, user.id)
        const correction = await dataSource.getRepository(CorrectionEntity).save({ authorId: user.id, grade: 80 })
        await sessionRepo.update({ id: student.kept.id }, { correctionId: correction.id })

        activity.source = {
          ...compiled('new'),
          variables: {
            title: 'new',
            settings: {},
            exerciseGroups: groups(exercise('kept', 'A'), exercise('reset', 'B2')),
          },
        }
        await (service as any).onReloadActivity({
          activity,
          changes: { resetExerciseIds: ['reset'], removedExerciseIds: ['gone'] },
        })

        const parent = await sessionRepo.findOneByOrFail({ id: student.parent.id })
        // 80 given by the teacher for the kept exercise, divided by the 2 remaining exercises.
        expect(parent.grade).toEqual(40)
      })

      it('should update the variables of a patched exercise and keep its answers', async () => {
        const user = await seedUser()
        const activity = await seedActivity(user.id)
        const student = await seedStudent(activity, user.id)
        // The builder computed the statement of the session from the template of the source.
        await sessionRepo.update(
          { id: student.reset.id },
          {
            source: { ...compiled('B'), variables: { title: 'B', statement: 'Calculer {{ a }}', seed: 7 } } as any,
            variables: { title: 'B', statement: 'Calculer 42', seed: 7 } as any,
          }
        )
        const answers = dataSource.getRepository(AnswerEntity)
        const answer = await answers.save({
          sessionId: student.reset.id,
          userId: user.id,
          variables: { title: 'B', statement: 'Calculer 42' } as any,
          grade: 50,
        })

        activity.source = {
          ...compiled('new'),
          variables: {
            title: 'new',
            settings: {},
            exerciseGroups: groups(exercise('kept', 'A'), {
              ...exercise('reset', 'B2'),
              source: { ...compiled('B2'), variables: { title: 'B2', statement: 'Calculez {{ a }}' } },
            }),
          },
        }
        await (service as any).onReloadActivity({
          activity,
          changes: {
            resetExerciseIds: [],
            removedExerciseIds: ['gone'],
            patchedExercises: [{ id: 'reset', variables: ['statement', 'title'] }],
          },
        })

        const reset = (await sessionRepo.findOneByOrFail({ id: student.reset.id })) as any
        expect(reset.variables).toEqual({ title: 'B2', statement: 'Calculer 42', seed: 7 })
        expect(reset.source.variables).toEqual({ title: 'B2', statement: 'Calculez {{ a }}', seed: 7 })
        expect(reset.grade).toEqual(50)
        expect(await answers.findOneByOrFail({ id: answer.id })).toMatchObject({
          grade: 50,
          variables: { title: 'B', statement: 'Calculer 42' },
        })
        expect(mockDeps.sessionService.linkDependencies).toHaveBeenCalled()

        const parent = (await sessionRepo.findOneByOrFail({ id: student.parent.id })) as any
        const item = parent.variables.navigation.exercises.find((candidate: any) => candidate.id === 'reset')
        expect(item).toMatchObject({ title: 'Nouveau', state: 'FAILED', grade: 50, sessionId: student.reset.id })
        expect(parent.variables.navigation.current).toMatchObject({ id: 'reset', title: 'Nouveau' })
        expect(parent.grade).toEqual(75)
      })

      it('should fail and keep the sessions unchanged when the update fails', async () => {
        const user = await seedUser()
        const activity = await seedActivity(user.id)
        const student = await seedStudent(activity, user.id)
        mockDeps.resourceFileService.getTitle.mockRejectedValue(new Error('boom'))

        activity.source = {
          ...compiled('new'),
          variables: {
            title: 'new',
            settings: {},
            exerciseGroups: groups(exercise('kept', 'A'), exercise('reset', 'B2')),
          },
        }
        await expect(
          (service as any).onReloadActivity({
            activity,
            changes: { resetExerciseIds: ['reset'], removedExerciseIds: ['gone'] },
          })
        ).rejects.toThrow('boom')

        const parent = (await sessionRepo.findOneByOrFail({ id: student.parent.id })) as any
        expect(parent.variables.title).toEqual('old')
        expect(parent.grade).toEqual(75)
        expect(await sessionRepo.countBy({ id: In([student.reset.id, student.gone.id]) })).toEqual(2)
      })

      it('should count the students who answered each exercise in the preview', async () => {
        const user = await seedUser()
        const activity = await seedActivity(user.id)
        await seedStudent(activity, user.id)
        activity.source = {
          ...activity.source,
          resource: 'res',
          variables: {
            settings: {},
            exerciseGroups: groups(exercise('kept', 'A'), exercise('reset', 'B'), exercise('gone', 'C')),
          } as any,
        } as any
        await activityRepo.save(activity)

        const compile = jest.fn().mockResolvedValue({
          source: {
            variables: {
              exerciseGroups: groups(
                { ...exercise('n1', 'A'), resource: 'kept' },
                { ...exercise('n2', 'B2'), resource: 'reset' }
              ),
            },
          },
        })
        const preview = await new (ActivityService as any)(
          {},
          { compile },
          ...Array(6).fill({}),
          activityRepo
        ).reloadPreview(activity.courseId, activity.id)

        expect(preview.exercises).toEqual([
          { key: 'kept', status: 'unchanged', title: 'A', startedCount: 1, changedVariables: [], risks: [] },
          { key: 'reset', status: 'modified', title: 'B2', startedCount: 1, changedVariables: ['title'], risks: [] },
          { key: 'gone', status: 'removed', title: 'C', startedCount: 0, changedVariables: [], risks: [] },
        ])
      })
    })

    it('should delete all sessions linked to the given activity', async () => {
      const user = await seedUser()
      const activity = await seedActivity(user.id)
      await seedSession(activity.id, user.id)
      await seedSession(activity.id, user.id)

      const beforeCount = await sessionRepo.count({ where: { activityId: activity.id } })
      expect(beforeCount).toBe(2)

      await (service as any).onReloadActivity({ activity })

      const afterCount = await sessionRepo.count({ where: { activityId: activity.id } })
      expect(afterCount).toBe(0)
    })

    it('should not delete sessions belonging to other activities', async () => {
      const user = await seedUser()
      const activity1 = await seedActivity(user.id)
      const activity2 = await seedActivity(user.id)

      await seedSession(activity1.id, user.id)
      await seedSession(activity2.id, user.id)

      await (service as any).onReloadActivity({ activity: activity1 })

      const remaining = await sessionRepo.count({ where: { activityId: activity2.id } })
      expect(remaining).toBe(1)
    })

    it('should not throw when no sessions exist for the activity', async () => {
      const user = await seedUser()
      const activity = await seedActivity(user.id)

      await expect((service as any).onReloadActivity({ activity })).resolves.not.toThrow()
    })
  })
})
