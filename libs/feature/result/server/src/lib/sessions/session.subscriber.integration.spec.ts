import { UserEntity, UserGroupEntity } from '@platon/core/server'
import { UserRoles } from '@platon/core/common'
import { createTestDatabase, TestDatabase } from '@platon/core/testing/server'
import {
  ActivityCorrectorEntity,
  ActivityEntity,
  CourseEntity,
  CourseMemberEntity,
  CourseSectionEntity,
} from '@platon/feature/course/server'
import { ResourceEntity } from '@platon/feature/resource/server'
import { ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'
import { LevelEntity, TopicEntity } from '@platon/core/server'
import { DataSource, Repository } from 'typeorm'
import { AnswerEntity } from '../answers/answer.entity'
import { CorrectionEntity } from '../correction/correction.entity'
import { StudentSubmissionEntity } from '../submissions/submission.entity'
import { SessionDataEntity } from './session-data.entity'
import { SessionEntity } from './session.entity'
import { SessionSubscriber } from './session.subscriber'

/**
 * Contrairement à session.subscriber.spec.ts (manager mocké), ce fichier fait tourner
 * SessionSubscriber contre un vrai Postgres (Testcontainers) pour exercer la vraie requête SQL
 * avec ses INNER JOIN sur Resources/Resources(circle) — un manager mocké ne peut jamais reproduire
 * le cas où ces jointures ne retournent aucune ligne (ressource introuvable), qui a été à l'origine
 * d'un crash silencieux corrigé sur retrieveSessionData (voir le commit qui ajoute
 * `result.length === 0` à la vérification).
 */
describe('SessionSubscriber (integration)', () => {
  let testDb: TestDatabase
  let dataSource: DataSource
  let sessionRepo: Repository<SessionEntity>
  let sessionDataRepo: Repository<SessionDataEntity>
  let userRepo: Repository<UserEntity>
  let resourceRepo: Repository<ResourceEntity>

  beforeAll(async () => {
    testDb = await createTestDatabase([
      UserEntity,
      UserGroupEntity,
      LevelEntity,
      TopicEntity,
      CourseEntity,
      CourseSectionEntity,
      CourseMemberEntity,
      ActivityEntity,
      ActivityCorrectorEntity,
      ResourceEntity,
      CorrectionEntity,
      StudentSubmissionEntity,
      AnswerEntity,
      SessionEntity,
      SessionDataEntity,
    ])
    dataSource = testDb.dataSource
    sessionRepo = dataSource.getRepository(SessionEntity)
    sessionDataRepo = dataSource.getRepository(SessionDataEntity)
    userRepo = dataSource.getRepository(UserEntity)
    resourceRepo = dataSource.getRepository(ResourceEntity)

    // S'enregistre auprès du dataSource, comme au démarrage réel de l'application.
    new SessionSubscriber(dataSource)
  }, 60_000)

  afterAll(async () => {
    await testDb.teardown()
  })

  afterEach(async () => {
    await dataSource.query('TRUNCATE "SessionData", "Sessions", "Resources", "Users" CASCADE')
  })

  it("devrait créer une SessionData correspondante à l'insertion d'une session dont la ressource existe", async () => {
    const user = await userRepo.save({ username: 'alice', role: UserRoles.student } as UserEntity)
    const circle = await resourceRepo.save({
      name: 'Circle',
      type: ResourceTypes.CIRCLE,
      status: ResourceStatus.READY,
      ownerId: user.id,
    } as ResourceEntity)
    const exercise = await resourceRepo.save({
      name: 'Exercise',
      type: ResourceTypes.EXERCISE,
      status: ResourceStatus.READY,
      ownerId: user.id,
      parentId: circle.id,
    } as ResourceEntity)

    const session = await sessionRepo.save({
      userId: user.id,
      variables: {},
      grade: -1,
      attempts: 0,
      source: { resource: exercise.id, version: 'latest' },
    } as unknown as SessionEntity)

    const sessionData = await sessionDataRepo.findOne({ where: { id: session.id } })

    expect(sessionData).not.toBeNull()
    expect(sessionData?.resourceId).toBe(exercise.id)
    expect(sessionData?.userId).toBe(user.id)
  })

  it("ne devrait pas planter ni créer de SessionData quand la ressource référencée n'existe pas (jointure vide)", async () => {
    const user = await userRepo.save({ username: 'bob', role: UserRoles.student } as UserEntity)

    const session = await sessionRepo.save({
      userId: user.id,
      variables: {},
      grade: -1,
      attempts: 0,
      source: { resource: '00000000-0000-0000-0000-000000000000', version: 'latest' },
    } as unknown as SessionEntity)

    const persisted = await sessionRepo.findOne({ where: { id: session.id } })
    const sessionData = await sessionDataRepo.findOne({ where: { id: session.id } })

    expect(persisted).not.toBeNull()
    expect(sessionData).toBeNull()
  })
})
