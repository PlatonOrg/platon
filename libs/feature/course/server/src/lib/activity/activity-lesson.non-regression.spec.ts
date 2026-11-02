/**
 * Tests de non-régression : activités de type « leçon » et brouillons (branche feature/open-class).
 * `it.failing` = défaut relevé par l'audit (AUD-xx), à passer en `it` une fois corrigé.
 *
 * Le service est construit sans module Nest (Object.create + champs injectés à la main) pour
 * rester indépendant de l'ordre des 15 dépendances du constructeur.
 */
import { ActivityKind } from '@platon/feature/course/common'
import { mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ActivityEntity } from './activity.entity'
import { ActivityService } from './activity.service'

const COURSE = '11111111-1111-4111-8111-111111111111'

type Role = 'student' | 'teacher'

const exercise = (patch: Partial<ActivityEntity> = {}): ActivityEntity =>
  ({
    id: 'ex-1',
    courseId: COURSE,
    kind: ActivityKind.EXERCISE,
    draft: false,
    source: { resource: 'res-1', variables: { title: 'Titre PL', exerciseGroups: {}, settings: {} } },
    ...patch,
  }) as unknown as ActivityEntity

const lesson = (patch: Partial<ActivityEntity> = {}): ActivityEntity =>
  ({
    id: 'lesson-1',
    courseId: COURSE,
    kind: ActivityKind.LESSON,
    activityTitle: '  Introduction  ',
    content: { blocks: [{ type: 'paragraph', data: { text: 'secret' } }] },
    draft: false,
    // Une leçon n'a pas de source compilée : tout accès à source.variables doit être évité.
    source: undefined,
    ...patch,
  }) as unknown as ActivityEntity

const buildService = (role: Role, rows: ActivityEntity[], completed: string[] = []) => {
  const qb = mockSelectQueryBuilder<ActivityEntity>()
  qb.getManyAndCount.mockResolvedValue([rows, rows.length])
  qb.getOne.mockResolvedValue(rows[0] ?? null)

  const deps = {
    request: { user: { id: `${role}-1`, role } },
    courseMemberService: { hasWritePermission: jest.fn().mockResolvedValue(role === 'teacher') },
    lessonProgressService: { findCompletedActivityIds: jest.fn().mockResolvedValue(new Set(completed)) },
    resourceRepository: { find: jest.fn().mockResolvedValue([{ id: 'res-1', name: 'Nom de la ressource' }]) },
    databaseService: { resolveVirtualColumns: jest.fn().mockResolvedValue(undefined) },
    activityMemberService: {},
    activityGroupService: {},
    // Méthodes privées remplacées : requêtage et recalcul des dates (hors périmètre de ces tests).
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    updateActivitiesDates: jest.fn().mockResolvedValue(undefined),
  }
  const service = Object.assign(Object.create(ActivityService.prototype), deps) as ActivityService
  return { service, deps, qb }
}

describe('ActivityService — leçons (non-régression)', () => {
  describe('search()', () => {
    it("masque les leçons en brouillon à l'étudiant et corrige le total", async () => {
      const { service } = buildService('student', [lesson(), lesson({ id: 'draft-1', draft: true }), exercise()])

      const [items, total] = await service.search(COURSE)

      expect(items.map((a) => a.id)).toEqual(['lesson-1', 'ex-1'])
      expect(total).toBe(2)
    })

    it("montre les brouillons à l'enseignant qui peut modifier le cours", async () => {
      const { service } = buildService('teacher', [lesson(), lesson({ id: 'draft-1', draft: true })])

      const [items, total] = await service.search(COURSE)

      expect(items.map((a) => a.id)).toEqual(['lesson-1', 'draft-1'])
      expect(total).toBe(2)
    })

    it('calcule les colonnes virtuelles d’une leçon sans toucher à source', async () => {
      const { service } = buildService('student', [lesson()], ['lesson-1'])

      const [[item]] = await service.search(COURSE)

      expect(item).toMatchObject({
        title: 'Introduction',
        exerciseCount: 0,
        progression: 100,
        resourceId: '',
        permissions: { answer: true, update: false, viewStats: false, viewResource: false },
      })
    })

    it("une leçon non terminée a une progression de 0, et la requête porte sur l'utilisateur courant", async () => {
      const { service, deps } = buildService('student', [lesson()])

      const [[item]] = await service.search(COURSE)

      expect(item.progression).toBe(0)
      expect(deps.lessonProgressService.findCompletedActivityIds).toHaveBeenCalledWith(['lesson-1'], 'student-1')
    })

    it("n'interroge pas la progression des leçons quand il n'y a que des exercices", async () => {
      const { service, deps } = buildService('student', [exercise()])

      await service.search(COURSE)

      expect(deps.lessonProgressService.findCompletedActivityIds).not.toHaveBeenCalled()
    })

    it.each([
      ['activityTitle prioritaire sur le titre PL', { activityTitle: 'Titre prof' }, 'Titre prof'],
      ['titre PL si activityTitle vide', { activityTitle: '   ' }, 'Titre PL'],
    ])('exercice : %s', async (_label, patch, expected) => {
      const { service } = buildService('student', [exercise(patch)])

      const [[item]] = await service.search(COURSE)

      expect(item.title).toBe(expected)
    })

    it('exercice sans titre PL ni activityTitle : nom de la ressource', async () => {
      const { service } = buildService('student', [
        exercise({ source: { resource: 'res-1', variables: { title: ' ', exerciseGroups: {} } } as never }),
      ])

      const [[item]] = await service.search(COURSE)

      expect(item.title).toBe('Nom de la ressource')
    })
  })

  describe('findByCourseId()', () => {
    it('renvoie une leçon publiée avec son contenu', async () => {
      const { service } = buildService('student', [lesson()])

      const found = await service.findByCourseId(COURSE, 'lesson-1')

      expect(found.isPresent()).toBe(true)
    })

    // AUD-06 : le filtre des brouillons n'existe que dans search(). GET
    // /courses/:courseId/activities/:activityId passe par findByCourseId() et renvoie à tout
    // membre du cours le contenu complet d'une leçon en brouillon (import PDF non relu, etc.).
    it.failing("AUD-06 ne renvoie pas une leçon en brouillon à l'étudiant", async () => {
      const { service } = buildService('student', [lesson({ draft: true })])

      const found = await service.findByCourseId(COURSE, 'lesson-1')

      expect(found.isPresent()).toBe(false)
    })

    it("renvoie une leçon en brouillon à l'enseignant", async () => {
      const { service } = buildService('teacher', [lesson({ draft: true })])

      const found = await service.findByCourseId(COURSE, 'lesson-1')

      expect(found.isPresent()).toBe(true)
    })
  })
})
