import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  DateRangeConfigDTO,
  MembersConfigDTO,
  CorrectorsConfigDTO,
  GroupsConfigDTO,
  OtherConfigDTO,
  RestrictionDTO,
  RestrictionListDTO,
  RestrictionType,
} from './activity-restriction.dto'

const isValid = async (dto: object) => (await validate(dto)).length === 0

describe('activity-restriction DTOs', () => {
  // ===================================================================
  describe('DateRangeConfigDTO', () => {
    it('accepte start et end comme strings ISO → convertis en Date', async () => {
      const dto = plainToInstance(DateRangeConfigDTO, {
        start: '2026-01-23T12:55:26.136Z',
        end: '2026-12-31T23:59:59.999Z',
      })
      expect(dto.start).toBeInstanceOf(Date)
      expect(dto.end).toBeInstanceOf(Date)
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte un objet vide (les deux champs sont optionnels)', async () => {
      const dto = plainToInstance(DateRangeConfigDTO, {})
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte start seul sans end', async () => {
      const dto = plainToInstance(DateRangeConfigDTO, { start: '2026-06-15T08:00:00.000Z' })
      expect(dto.start).toBeInstanceOf(Date)
      expect(await isValid(dto)).toBe(true)
    })

    it('rejette une date invalide pour start', async () => {
      const dto = plainToInstance(DateRangeConfigDTO, { start: 'pas-une-date' })
      expect(await isValid(dto)).toBe(false)
    })

    it('rejette une date invalide pour end', async () => {
      const dto = plainToInstance(DateRangeConfigDTO, { end: 'pas-une-date' })
      expect(await isValid(dto)).toBe(false)
    })
  })

  // ===================================================================
  describe('MembersConfigDTO', () => {
    it('accepte un tableau de strings', async () => {
      const dto = plainToInstance(MembersConfigDTO, { members: ['m1', 'm2'] })
      expect(dto.members).toEqual(['m1', 'm2'])
      expect(await isValid(dto)).toBe(true)
    })

    it('convertit une string seule en tableau', async () => {
      const dto = plainToInstance(MembersConfigDTO, { members: 'm1' })
      expect(dto.members).toEqual(['m1'])
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte un objet vide (members optionnel → tableau vide après transform)', async () => {
      const dto = plainToInstance(MembersConfigDTO, {})
      expect(await isValid(dto)).toBe(true)
    })

    it('rejette un tableau contenant des non-strings', async () => {
      const dto = plainToInstance(MembersConfigDTO, { members: [1, 2] })
      expect(await isValid(dto)).toBe(false)
    })
  })

  // ===================================================================
  describe('CorrectorsConfigDTO', () => {
    it('accepte un tableau de strings', async () => {
      const dto = plainToInstance(CorrectorsConfigDTO, { correctors: ['c1', 'c2'] })
      expect(dto.correctors).toEqual(['c1', 'c2'])
      expect(await isValid(dto)).toBe(true)
    })

    it('convertit une string seule en tableau', async () => {
      const dto = plainToInstance(CorrectorsConfigDTO, { correctors: 'c1' })
      expect(dto.correctors).toEqual(['c1'])
      expect(await isValid(dto)).toBe(true)
    })
  })

  // ===================================================================
  describe('GroupsConfigDTO', () => {
    it('accepte un tableau de strings', async () => {
      const dto = plainToInstance(GroupsConfigDTO, { groups: ['g1', 'g2'] })
      expect(dto.groups).toEqual(['g1', 'g2'])
      expect(await isValid(dto)).toBe(true)
    })

    it('convertit une string seule en tableau', async () => {
      const dto = plainToInstance(GroupsConfigDTO, { groups: 'g1' })
      expect(dto.groups).toEqual(['g1'])
      expect(await isValid(dto)).toBe(true)
    })
  })

  // ===================================================================
  describe('OtherConfigDTO', () => {
    it('accepte enabled: true', async () => {
      const dto = plainToInstance(OtherConfigDTO, { enabled: true })
      expect(dto.enabled).toBe(true)
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte enabled: false', async () => {
      const dto = plainToInstance(OtherConfigDTO, { enabled: false })
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte un objet vide (enabled optionnel)', async () => {
      const dto = plainToInstance(OtherConfigDTO, {})
      expect(await isValid(dto)).toBe(true)
    })

    it('rejette une valeur non-booléenne pour enabled', async () => {
      const dto = plainToInstance(OtherConfigDTO, { enabled: 'oui' })
      expect(await isValid(dto)).toBe(false)
    })
  })

  // ===================================================================
  describe('RestrictionDTO', () => {
    it('instancie DateRangeConfigDTO pour type DateRange et valide', async () => {
      const dto = plainToInstance(RestrictionDTO, {
        type: RestrictionType.DateRange,
        config: { start: '2026-01-23T12:55:26.136Z', end: '2026-12-31T23:59:59.999Z' },
      })
      expect(dto.config).toBeInstanceOf(DateRangeConfigDTO)
      expect(await isValid(dto)).toBe(true)
    })

    it('instancie MembersConfigDTO pour type Members et valide', async () => {
      const dto = plainToInstance(RestrictionDTO, {
        type: RestrictionType.Members,
        config: { members: ['m1', 'm2'] },
      })
      expect(dto.config).toBeInstanceOf(MembersConfigDTO)
      expect(await isValid(dto)).toBe(true)
    })

    it('instancie CorrectorsConfigDTO pour type Correctors et valide', async () => {
      const dto = plainToInstance(RestrictionDTO, {
        type: RestrictionType.Correctors,
        config: { correctors: ['c1'] },
      })
      expect(dto.config).toBeInstanceOf(CorrectorsConfigDTO)
      expect(await isValid(dto)).toBe(true)
    })

    it('instancie GroupsConfigDTO pour type Groups et valide', async () => {
      const dto = plainToInstance(RestrictionDTO, {
        type: RestrictionType.Groups,
        config: { groups: ['g1'] },
      })
      expect(dto.config).toBeInstanceOf(GroupsConfigDTO)
      expect(await isValid(dto)).toBe(true)
    })

    it('instancie OtherConfigDTO pour type Others et valide', async () => {
      const dto = plainToInstance(RestrictionDTO, {
        type: RestrictionType.Other,
        config: { enabled: true },
      })
      expect(dto.config).toBeInstanceOf(OtherConfigDTO)
      expect(await isValid(dto)).toBe(true)
    })

    it('rejette un type inconnu', async () => {
      const dto = plainToInstance(RestrictionDTO, { type: 'TypeInconnu', config: {} })
      expect(await isValid(dto)).toBe(false)
    })

    it('rejette quand type est absent', async () => {
      const dto = plainToInstance(RestrictionDTO, { config: {} })
      expect(await isValid(dto)).toBe(false)
    })

    it('propage les erreurs de validation du config imbriqué (DateRange invalide)', async () => {
      const dto = plainToInstance(RestrictionDTO, {
        type: RestrictionType.DateRange,
        config: { start: 'pas-une-date' },
      })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      const configError = errors.find((e) => e.property === 'config')
      expect(configError?.children?.length).toBeGreaterThan(0)
    })
  })

  // ===================================================================
  describe('RestrictionListDTO', () => {
    it('accepte une liste valide de restrictions', async () => {
      const dto = plainToInstance(RestrictionListDTO, {
        restriction: [
          { type: RestrictionType.DateRange, config: { start: '2026-01-23T12:55:26.136Z' } },
          { type: RestrictionType.Members, config: { members: ['m1'] } },
        ],
      })
      expect(dto.restriction[0]).toBeInstanceOf(RestrictionDTO)
      expect(dto.restriction[1]).toBeInstanceOf(RestrictionDTO)
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte une liste vide', async () => {
      const dto = plainToInstance(RestrictionListDTO, { restriction: [] })
      expect(await isValid(dto)).toBe(true)
    })

    it("propage les erreurs d'une restriction invalide dans la liste", async () => {
      const dto = plainToInstance(RestrictionListDTO, {
        restriction: [{ type: 'TypeInvalide', config: {} }],
      })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })
  })
})
