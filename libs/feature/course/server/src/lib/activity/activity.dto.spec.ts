import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ActivityKind } from '@platon/feature/course/common'
import { CreateCourseActivityDTO, UpdateCourseActivityDTO } from './activity.dto'

const isValid = async (dto: object) => (await validate(dto)).length === 0

describe('CreateCourseActivityDTO', () => {
  const sectionId = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  const resourceId = '3fa85f64-5717-4562-b3fc-2c963f66afa7'

  describe('kind=exercise (par défaut ou explicite)', () => {
    it('accepte un exercice avec resourceId et resourceVersion', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, { sectionId, resourceId, resourceVersion: 'latest' })
      expect(await isValid(dto)).toBe(true)
    })

    it('applique kind=exercise par défaut quand il est omis', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, { sectionId, resourceId, resourceVersion: 'latest' })
      expect(dto.kind).toBe(ActivityKind.EXERCISE)
    })

    it('rejette un exercice sans resourceId', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, { sectionId, resourceVersion: 'latest' })
      expect(await isValid(dto)).toBe(false)
    })

    it('rejette un exercice sans resourceVersion', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, { sectionId, resourceId })
      expect(await isValid(dto)).toBe(false)
    })

    it('rejette kind=exercise explicite avec lessonTitle mais sans resourceId (lessonTitle ne dispense pas de resourceId)', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, {
        sectionId,
        kind: ActivityKind.EXERCISE,
        lessonTitle: 'Introduction',
      })
      expect(await isValid(dto)).toBe(false)
    })
  })

  describe('kind=lesson', () => {
    it('accepte une leçon avec lessonTitle, sans resourceId ni resourceVersion', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, {
        sectionId,
        kind: ActivityKind.LESSON,
        lessonTitle: 'Introduction au réseau',
      })
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte une leçon avec un content EditorJS', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, {
        sectionId,
        kind: ActivityKind.LESSON,
        lessonTitle: 'Introduction au réseau',
        content: { blocks: [{ type: 'paragraph', data: { text: 'Bonjour' } }] },
      })
      expect(await isValid(dto)).toBe(true)
    })

    it('rejette une leçon sans lessonTitle', async () => {
      const dto = plainToInstance(CreateCourseActivityDTO, { sectionId, kind: ActivityKind.LESSON })
      expect(await isValid(dto)).toBe(false)
    })
  })
})

describe('UpdateCourseActivityDTO', () => {
  describe('code', () => {
    it('accepte un code de 6 caractères alphanumériques majuscules', async () => {
      const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'AB12CD' })
      expect(await isValid(dto)).toBe(true)
    })

    it('accepte un DTO sans code (champ optionnel)', async () => {
      const dto = plainToInstance(UpdateCourseActivityDTO, {})
      expect(await isValid(dto)).toBe(true)
    })

    it('rejette un code en minuscules', async () => {
      const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'ab12cd' })
      expect(await isValid(dto)).toBe(false)
    })

    it("rejette un code trop court (ex: '123456' évitable mais volontairement trop court ici)", async () => {
      const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'AB12' })
      expect(await isValid(dto)).toBe(false)
    })

    it('rejette un code trop long', async () => {
      const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'AB12CD34' })
      expect(await isValid(dto)).toBe(false)
    })

    it('rejette un code contenant des caractères spéciaux', async () => {
      const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'AB-2CD' })
      expect(await isValid(dto)).toBe(false)
    })
  })
})
