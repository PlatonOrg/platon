import { makeUser } from '@platon/core/testing/common'
import { CourseMember, CourseGroup } from '@platon/feature/course/common'
import { Restriction, RestrictionList, RestrictionType } from '@platon/feature/course/common'
import { ActivityRestrictionsValidatorService } from './activity-restrictions-validator.service'

const period = (...restrictions: Restriction[]): RestrictionList => ({ restriction: restrictions })

const dateRange = (start?: Date, end?: Date): Restriction => ({
  type: RestrictionType.DateRange,
  config: { start, end },
})

const members = (...ids: string[]): Restriction => ({
  type: RestrictionType.Members,
  config: { members: ids },
})

const groups = (...ids: string[]): Restriction => ({
  type: RestrictionType.Groups,
  config: { groups: ids },
})

const others = (): Restriction => ({
  type: RestrictionType.Others,
  config: { enabled: true },
})

const makeMember = (id: string, firstName?: string, lastName?: string): CourseMember => ({
  id,
  createdAt: new Date('2026-23-04'),
  updatedAt: new Date('2026-23-04'),
  courseId: 'course-1',
  user:
    firstName != null && lastName != null
      ? ({ id: `user-${id}`, firstName, lastName, username: id } as any)
      : undefined,
})

const makeGroupMember = (
  id: string,
  groupName: string,
  groupUsers: { id: string; firstName: string; lastName: string }[] = []
): CourseMember => ({
  id,
  createdAt: new Date('2026-23-04'),
  updatedAt: new Date('2026-23-04'),
  courseId: 'course-1',
  group: {
    id: `group-${id}`,
    name: groupName,
    createdAt: new Date('2026-23-04'),
    updatedAt: new Date('2026-23-04'),
    users: groupUsers.map((u) => ({
      ...u,
      username: u.id,
      email: '',
      role: 'student' as any,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  },
})

const makeCourseGroup = (id: string, name: string): CourseGroup => ({
  id,
  groupId: `gid-${id}`,
  name,
  courseId: 'course-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
})

describe('ActivityRestrictionsValidatorService', () => {
  let service: ActivityRestrictionsValidatorService

  beforeEach(() => {
    service = new ActivityRestrictionsValidatorService()
  })

  describe('hasOthersRule()', () => {
    it('retourne false pour un tableau vide', () => {
      expect(service.hasOthersRule([])).toBe(false)
    })

    it('retourne false quand aucune période ne contient Others', () => {
      const periods = [period(members('m1')), period(groups('g1'))]
      expect(service.hasOthersRule(periods)).toBe(false)
    })

    it('retourne true quand une période contient Others', () => {
      const periods = [period(members('m1')), period(others())]
      expect(service.hasOthersRule(periods)).toBe(true)
    })

    it('retourne true quand plusieurs périodes contiennent Others', () => {
      const periods = [period(others()), period(others())]
      expect(service.hasOthersRule(periods)).toBe(true)
    })
  })

  describe('checkGroupConflicts()', () => {
    it('retourne hasConflicts: false pour un tableau vide', () => {
      const result = service.checkGroupConflicts([])
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })

    it('retourne hasConflicts: false si les groupes sont dans des périodes différentes', () => {
      const periods = [period(groups('g1', 'g2')), period(groups('g3'))]
      const result = service.checkGroupConflicts(periods)
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })

    it('détecte un conflit quand le même groupe apparaît dans deux périodes', () => {
      const periods = [period(groups('g1', 'g2')), period(groups('g1'))]
      const result = service.checkGroupConflicts(periods)
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toEqual({ id: 'g1', periods: [1, 2] })
    })

    it('reporte plusieurs groupes en conflit avec les bons numéros de période', () => {
      const periods = [period(groups('g1', 'g2')), period(groups('g1')), period(groups('g2'))]
      const result = service.checkGroupConflicts(periods)
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(2)
      expect(result.conflicts.find((c) => c.id === 'g1')?.periods).toEqual([1, 2])
      expect(result.conflicts.find((c) => c.id === 'g2')?.periods).toEqual([1, 3])
    })

    it('gère une restriction Groups sans la clé groups (config vide)', () => {
      const periods = [{ restriction: [{ type: 'Groups' as const, config: {} }] }]
      const result = service.checkGroupConflicts(periods)
      expect(result.hasConflicts).toBe(false)
    })
  })

  // ===================================================================
  describe('checkMemberConflicts()', () => {
    it('retourne hasConflicts: false pour un tableau vide', () => {
      const result = service.checkMemberConflicts([], [])
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })

    it('retourne hasConflicts: false si les membres sont dans des périodes différentes', () => {
      const periods = [period(members('m1', 'm2')), period(members('m3'))]
      const result = service.checkMemberConflicts(periods, [])
      expect(result.hasConflicts).toBe(false)
    })

    it('détecte un conflit quand le même membre apparaît dans deux périodes', () => {
      const periods = [period(members('m1')), period(members('m1'))]
      const result = service.checkMemberConflicts(periods, [])
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toEqual({ id: 'm1', periods: [1, 2] })
    })

    it('reporte plusieurs membres en conflit', () => {
      const periods = [period(members('m1', 'm2')), period(members('m1')), period(members('m2'))]
      const result = service.checkMemberConflicts(periods, [])
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(2)
    })
  })

  // ===================================================================
  describe('validateRestrictions()', () => {
    it('retourne isValid: true pour un tableau de périodes vide', () => {
      expect(service.validateRestrictions([], [], [])).toEqual({ isValid: true })
    })

    it('retourne isValid: true pour des périodes valides sans conflits', () => {
      const periods = [period(members('m1'), dateRange()), period(groups('g1'), others())]
      expect(service.validateRestrictions(periods, [], [])).toEqual({ isValid: true })
    })

    // --- checkMultipleOthers ---
    it('échoue quand plusieurs périodes ont le type Others', () => {
      const periods = [period(members('m1'), others()), period(groups('g1'), others())]
      const result = service.validateRestrictions(periods, [], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Tous les autres')
    })

    // --- checkDateOnlyPeriods ---
    it('échoue quand une période ne contient que DateRange', () => {
      const periods = [period(dateRange(new Date(), new Date()))]
      const result = service.validateRestrictions(periods, [], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Période n°1')
    })

    it("mentionne toutes les périodes incomplètes dans le message d'erreur", () => {
      const periods = [period(dateRange()), period(members('m1')), period(dateRange())]
      const result = service.validateRestrictions(periods, [], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Période n°1')
      expect(result.errorMessage).toContain('Période n°3')
      expect(result.errorMessage).not.toContain('Période n°2')
    })

    // --- checkMultipleOthers a la priorité sur checkDateOnlyPeriods ---
    it('reporte MultipleOthers en priorité sur DateOnlyPeriods si les deux sont présents', () => {
      const periods = [period(dateRange()), period(others()), period(others())]
      const result = service.validateRestrictions(periods, [], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Tous les autres')
      expect(result.errorMessage).not.toContain('Période n°1')
    })

    // --- checkGroupConflicts avec formatage du message ---
    it('échoue sur conflit de groupe et affiche le nom du groupe', () => {
      const periods = [period(groups('g1')), period(groups('g1'))]
      const courseGroups = [makeCourseGroup('g1', 'Groupe A')]
      const result = service.validateRestrictions(periods, [], courseGroups)
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Groupe A')
      expect(result.errorMessage).toContain('1, 2')
    })

    it('utilise le fallback "Groupe <id>" si le groupe n\'est pas trouvé', () => {
      const periods = [period(groups('g-unknown')), period(groups('g-unknown'))]
      const result = service.validateRestrictions(periods, [], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Groupe g-unknown')
    })

    // --- checkMemberConflicts avec formatage du message ---
    it('échoue sur conflit de membre et affiche le nom complet (prénom + nom)', () => {
      const periods = [period(members('m1')), period(members('m1'))]
      const courseMembers = [makeMember('m1', 'Alice', 'Dupont')]
      const result = service.validateRestrictions(periods, courseMembers, [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Alice Dupont')
    })

    it("affiche le username quand le membre n'a pas de prénom/nom", () => {
      const memberWithUsername: CourseMember = {
        id: 'm2',
        createdAt: new Date(),
        updatedAt: new Date(),
        courseId: 'course-1',
        user: makeUser({ username: 'alice.d', firstName: '', lastName: '' }),
      }
      const periods = [period(members('m2')), period(members('m2'))]
      const result = service.validateRestrictions(periods, [memberWithUsername], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('alice.d')
    })

    it('utilise le fallback "Membre <id>" si le membre n\'est pas trouvé', () => {
      const periods = [period(members('m-unknown')), period(members('m-unknown'))]
      const result = service.validateRestrictions(periods, [], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Membre m-unknown')
    })

    it('affiche le nom du groupe quand le membre est un groupe (pas un user)', () => {
      const groupMember = makeGroupMember('m3', 'Groupe Bleu')
      const periods = [period(members('m3')), period(members('m3'))]
      const result = service.validateRestrictions(periods, [groupMember], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Groupe Bleu')
    })

    it('résout le nom d\'un utilisateur via le format "memberId:userId"', () => {
      const groupMember = makeGroupMember('m4', 'Groupe Rouge', [{ id: 'u99', firstName: 'Bob', lastName: 'Martin' }])
      const memberId = 'm4:u99'
      const periods = [period(members(memberId)), period(members(memberId))]
      const result = service.validateRestrictions(periods, [groupMember], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Bob Martin')
    })

    it('utilise le fallback "Utilisateur <userId>" si userId non trouvé dans le groupe', () => {
      const groupMember = makeGroupMember('m5', 'Groupe Vert', [])
      const memberId = 'm5:u-unknown'
      const periods = [period(members(memberId)), period(members(memberId))]
      const result = service.validateRestrictions(periods, [groupMember], [])
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('Utilisateur u-unknown')
    })
  })
})
