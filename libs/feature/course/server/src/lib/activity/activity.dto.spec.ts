import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ActivityKind } from '@platon/feature/course/common'
import { CreateCourseActivityDTO, UpdateCourseActivityDTO } from './activity.dto'

const isValid = async (dto: object) => (await validate(dto)).length === 0

const SECTION_ID = 'b0e1c2d3-4f5a-4b6c-8d7e-9f0a1b2c3d4e'
const RESOURCE_ID = 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

describe('CreateCourseActivityDTO', () => {
  it('kind est optionnel et vaut EXERCISE par défaut', () => {
    const dto = plainToInstance(CreateCourseActivityDTO, {
      sectionId: SECTION_ID,
      resourceId: RESOURCE_ID,
      resourceVersion: 'latest',
    })
    expect(dto.kind).toBe(ActivityKind.EXERCISE)
  })

  it('accepte une activité exercise avec resourceId et resourceVersion', async () => {
    const dto = plainToInstance(CreateCourseActivityDTO, {
      kind: ActivityKind.EXERCISE,
      sectionId: SECTION_ID,
      resourceId: RESOURCE_ID,
      resourceVersion: 'latest',
    })
    expect(await isValid(dto)).toBe(true)
  })

  it('rejette une activité exercise sans resourceId', async () => {
    const dto = plainToInstance(CreateCourseActivityDTO, {
      kind: ActivityKind.EXERCISE,
      sectionId: SECTION_ID,
      resourceVersion: 'latest',
    })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'resourceId')).toBe(true)
  })

  it('rejette une activité exercise sans resourceVersion', async () => {
    const dto = plainToInstance(CreateCourseActivityDTO, {
      kind: ActivityKind.EXERCISE,
      sectionId: SECTION_ID,
      resourceId: RESOURCE_ID,
    })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'resourceVersion')).toBe(true)
  })

  it('accepte une leçon avec uniquement lessonTitle, sans resourceId ni resourceVersion', async () => {
    const dto = plainToInstance(CreateCourseActivityDTO, {
      kind: ActivityKind.LESSON,
      sectionId: SECTION_ID,
      lessonTitle: 'Ma leçon',
    })
    expect(await isValid(dto)).toBe(true)
  })

  it('rejette une leçon sans lessonTitle', async () => {
    const dto = plainToInstance(CreateCourseActivityDTO, {
      kind: ActivityKind.LESSON,
      sectionId: SECTION_ID,
    })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'lessonTitle')).toBe(true)
  })

  it('accepte content et draft optionnels pour une leçon', async () => {
    const dto = plainToInstance(CreateCourseActivityDTO, {
      kind: ActivityKind.LESSON,
      sectionId: SECTION_ID,
      lessonTitle: 'Ma leçon',
      content: { blocks: [] },
      draft: true,
    })
    expect(await isValid(dto)).toBe(true)
  })
})

describe('UpdateCourseActivityDTO', () => {
  it('accepte un code de 6 caractères alphanumériques majuscules', async () => {
    const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'AB12CD' })
    expect(await isValid(dto)).toBe(true)
  })

  it('code est optionnel', async () => {
    const dto = plainToInstance(UpdateCourseActivityDTO, {})
    expect(await isValid(dto)).toBe(true)
  })

  it('rejette un code en minuscules', async () => {
    const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'ab12cd' })
    expect(await isValid(dto)).toBe(false)
  })

  it("rejette un code d'une longueur différente de 6", async () => {
    const dto = plainToInstance(UpdateCourseActivityDTO, { code: 'AB12' })
    expect(await isValid(dto)).toBe(false)
  })
})
