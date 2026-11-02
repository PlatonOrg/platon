/**
 * Tests de non-régression : progression des leçons PlatonClass (branche feature/open-class).
 * `it.failing` = défaut relevé par l'audit (AUD-xx), à passer en `it` une fois corrigé.
 */
import { IRequest } from '@platon/core/server'
import { mockRepository, MockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ActivityKind } from '@platon/feature/course/common'
import { QueryFailedError, Repository } from 'typeorm'
import { ActivityEntity } from '../activity/activity.entity'
import { ActivityService } from '../activity/activity.service'
import { CoursePermissionsService } from '../permissions/permissions.service'
import { LessonProgressController } from './lesson-progress.controller'
import { CourseLessonProgressEntity } from './lesson-progress.entity'
import { LessonProgressService } from './lesson-progress.service'

const COURSE = '11111111-1111-4111-8111-111111111111'
const LESSON = '33333333-3333-4333-8333-333333333333'

describe('LessonProgressService (non-régression)', () => {
  let repository: MockRepository<CourseLessonProgressEntity>
  let service: LessonProgressService

  beforeEach(() => {
    repository = mockRepository<CourseLessonProgressEntity>()
    service = new LessonProgressService(repository as unknown as Repository<CourseLessonProgressEntity>)
  })

  it("filtre toujours sur l'utilisateur : la progression d'un autre étudiant n'est jamais comptée", async () => {
    const qb = mockSelectQueryBuilder<CourseLessonProgressEntity>()
    ;(qb as unknown as { getRawMany: jest.Mock }).getRawMany = jest.fn().mockResolvedValue([{ activityId: LESSON }])
    repository.createQueryBuilder.mockReturnValue(qb)

    const ids = await service.findCompletedActivityIds([LESSON, 'other'], 'user-1')

    expect(ids).toEqual(new Set([LESSON]))
    expect(qb.andWhere).toHaveBeenCalledWith('progress.user_id = :userId', { userId: 'user-1' })
    expect(qb.where).toHaveBeenCalledWith('progress.activity_id IN (:...activityIds)', {
      activityIds: [LESSON, 'other'],
    })
  })

  it('ne réécrit pas la date de fin quand la leçon est revue une seconde fois', async () => {
    repository.findOne.mockResolvedValue({ completedAt: new Date('2026-01-01') } as CourseLessonProgressEntity)

    await service.markCompleted(LESSON, 'user-1')

    expect(repository.save).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  // AUD-08 : findOne puis save n'est pas atomique. Deux requêtes simultanées (double clic,
  // deux onglets, rejeu réseau) passent toutes deux le findOne ; la seconde viole la contrainte
  // unique (23505) et l'étudiant reçoit une erreur 500. Attendu : opération idempotente
  // (INSERT ... ON CONFLICT DO NOTHING, ou capture de l'erreur 23505).
  it.failing('AUD-08 un doublon concurrent (violation unique 23505) ne fait pas échouer la requête', async () => {
    repository.findOne.mockResolvedValue(null)
    repository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate key'), { code: '23505' }))
    )

    await expect(service.markCompleted(LESSON, 'user-1')).resolves.toBeUndefined()
  })
})

describe('LessonProgressController (non-régression)', () => {
  let activityService: jest.Mocked<Pick<ActivityService, 'findByCourseId'>>
  let permissions: jest.Mocked<Pick<CoursePermissionsService, 'ensureActivityReadPermission'>>
  let progress: jest.Mocked<Pick<LessonProgressService, 'markCompleted'>>
  let controller: LessonProgressController
  const req = { user: { id: 'student-1', role: 'student' } } as unknown as IRequest

  const optionalOf = (activity?: Partial<ActivityEntity>) => ({
    orElseThrow: (fn: () => Error) => {
      if (!activity) throw fn()
      return activity
    },
  })

  const lesson = (patch: Partial<ActivityEntity> = {}): Partial<ActivityEntity> => ({
    id: LESSON,
    courseId: COURSE,
    kind: ActivityKind.LESSON,
    draft: false,
    state: 'opened',
    ...patch,
  })

  beforeEach(() => {
    activityService = { findByCourseId: jest.fn() }
    permissions = { ensureActivityReadPermission: jest.fn().mockResolvedValue(undefined) }
    progress = { markCompleted: jest.fn().mockResolvedValue(undefined) }
    controller = new LessonProgressController(
      activityService as unknown as ActivityService,
      permissions as unknown as CoursePermissionsService,
      progress as unknown as LessonProgressService
    )
  })

  it("enregistre la progression pour l'utilisateur authentifié, jamais pour un id fourni par le client", async () => {
    activityService.findByCourseId.mockResolvedValue(optionalOf(lesson()) as never)

    await controller.markCompleted(req, COURSE, LESSON)

    expect(activityService.findByCourseId).toHaveBeenCalledWith(COURSE, LESSON)
    expect(permissions.ensureActivityReadPermission).toHaveBeenCalled()
    expect(progress.markCompleted).toHaveBeenCalledWith(LESSON, 'student-1')
  })

  it("refuse une activité qui n'appartient pas au cours de l'URL", async () => {
    activityService.findByCourseId.mockResolvedValue(optionalOf(undefined) as never)

    await expect(controller.markCompleted(req, COURSE, LESSON)).rejects.toBeTruthy()
    expect(progress.markCompleted).not.toHaveBeenCalled()
  })

  it("n'enregistre rien si l'étudiant n'a pas accès à l'activité", async () => {
    activityService.findByCourseId.mockResolvedValue(optionalOf(lesson()) as never)
    permissions.ensureActivityReadPermission.mockRejectedValue(new Error('forbidden'))

    await expect(controller.markCompleted(req, COURSE, LESSON)).rejects.toThrow('forbidden')
    expect(progress.markCompleted).not.toHaveBeenCalled()
  })

  // AUD-07 : le contrôleur accepte n'importe quelle activité. Un étudiant peut « terminer »
  // une leçon en brouillon, une leçon pas encore ouverte (ou fermée), voire un exercice :
  // des lignes parasites sont créées et la progression du cours est faussée (cf. CourseExpander).
  it.failing.each([
    ['un exercice', { kind: ActivityKind.EXERCISE }],
    ['une leçon en brouillon', { draft: true }],
    ['une leçon planifiée', { state: 'planned' as const }],
  ])('AUD-07 refuse de marquer terminée %s', async (_label, patch) => {
    activityService.findByCourseId.mockResolvedValue(optionalOf(lesson(patch)) as never)

    await expect(controller.markCompleted(req, COURSE, LESSON)).rejects.toBeTruthy()
    expect(progress.markCompleted).not.toHaveBeenCalled()
  })
})
