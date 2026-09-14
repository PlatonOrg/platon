import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActivityEntity } from '@platon/feature/course/server'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { LabelEntity } from './label.entity'
import { LabelService } from './label.service'
import { ResourceLabelEntity } from './resource-label/resource-label.entity'
import { UserFavoriteLabel } from './user-favorite-label/user-favorite-label.entity'

describe('LabelService', () => {
  let service: LabelService
  let labelRepository: MockRepository<LabelEntity>
  let resourceLabelRepository: MockRepository<ResourceLabelEntity>
  let userFavoriteLabelRepository: MockRepository<UserFavoriteLabel>
  let activityRepository: MockRepository<ActivityEntity>

  beforeEach(async () => {
    labelRepository = mockRepository<LabelEntity>()
    resourceLabelRepository = mockRepository<ResourceLabelEntity>()
    userFavoriteLabelRepository = mockRepository<UserFavoriteLabel>()
    activityRepository = mockRepository<ActivityEntity>()

    const module = await Test.createTestingModule({
      providers: [
        LabelService,
        { provide: getRepositoryToken(LabelEntity), useValue: labelRepository },
        { provide: getRepositoryToken(ResourceLabelEntity), useValue: resourceLabelRepository },
        { provide: getRepositoryToken(UserFavoriteLabel), useValue: userFavoriteLabelRepository },
        { provide: getRepositoryToken(ActivityEntity), useValue: activityRepository },
      ],
    }).compile()

    service = module.get(LabelService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getResourceId', () => {
    it("devrait lever une NotFoundException si l'activité n'existe pas", async () => {
      activityRepository.findOne.mockResolvedValue(null)

      await expect(service.getResourceId('activity-1', 'ex-1')).rejects.toBeInstanceOf(NotFoundException)
    })

    it("devrait lever une NotFoundException si l'activité n'a pas de resource", async () => {
      activityRepository.findOne.mockResolvedValue({
        source: { resource: undefined },
      } as unknown as ActivityEntity)

      await expect(service.getResourceId('activity-1', 'ex-1')).rejects.toBeInstanceOf(NotFoundException)
    })

    it("devrait lever une NotFoundException si l'exercice n'est pas trouvé dans les groupes", async () => {
      activityRepository.findOne.mockResolvedValue({
        source: { resource: 'res-1', variables: { exerciseGroups: [] } },
      } as unknown as ActivityEntity)

      await expect(service.getResourceId('activity-1', 'ex-unknown')).rejects.toBeInstanceOf(NotFoundException)
    })

    it("devrait retourner la resource de l'exercice trouvé dans un tableau de groupes", async () => {
      activityRepository.findOne.mockResolvedValue({
        source: {
          resource: 'res-1',
          variables: { exerciseGroups: [{ exercises: [{ id: 'ex-1', resource: 'ex-res-1' }] }] },
        },
      } as unknown as ActivityEntity)

      const result = await service.getResourceId('activity-1', 'ex-1')

      expect(result).toBe('ex-res-1')
    })

    it("devrait retourner la resource de l'exercice trouvé dans un objet de groupes", async () => {
      activityRepository.findOne.mockResolvedValue({
        source: {
          resource: 'res-1',
          variables: { exerciseGroups: { g1: { exercises: [{ id: 'ex-1', resource: 'ex-res-1' }] } } },
        },
      } as unknown as ActivityEntity)

      const result = await service.getResourceId('activity-1', 'ex-1')

      expect(result).toBe('ex-res-1')
    })
  })

  describe('saveAndList', () => {
    it('devrait sauvegarder le label, le resourceLabel puis retourner la liste', async () => {
      labelRepository.save.mockResolvedValue({ id: 'label-1' } as LabelEntity)
      activityRepository.findOne.mockResolvedValue({
        source: {
          resource: 'res-1',
          variables: { exerciseGroups: [{ exercises: [{ id: 'ex-1', resource: 'ex-res-1' }] }] },
        },
      } as unknown as ActivityEntity)
      resourceLabelRepository.find.mockResolvedValue([])
      labelRepository.findOne.mockResolvedValue(null)

      await service.saveAndList({ name: 'label' } as never, 'activity-1', 'ex-1')

      expect(resourceLabelRepository.save).toHaveBeenCalledWith({
        resourceId: 'ex-res-1',
        labelId: 'label-1',
        navigationExerciseId: 'ex-1',
      })
    })
  })

  describe('list', () => {
    it('devrait retourner les labels correspondant aux resourceLabels', async () => {
      resourceLabelRepository.find.mockResolvedValue([{ labelId: 'label-1' } as ResourceLabelEntity])
      labelRepository.findOne.mockResolvedValue({ id: 'label-1' } as LabelEntity)

      const result = await service.list('ex-1')

      expect(result).toHaveLength(1)
    })
  })

  describe('findById', () => {
    it('devrait retourner Optional.empty si non trouvé', async () => {
      labelRepository.findOne.mockResolvedValue(null)

      expect((await service.findById('label-1')).isPresent()).toBe(false)
    })
  })

  describe('favLabel / unfavLabel / getUserFav', () => {
    it('favLabel devrait sauvegarder puis retourner les favoris', async () => {
      userFavoriteLabelRepository.find.mockResolvedValue([{ labelId: 'label-1' }] as UserFavoriteLabel[])
      labelRepository.findOne.mockResolvedValue({ id: 'label-1' } as LabelEntity)

      const result = await service.favLabel({ id: 'label-1' } as LabelEntity, 'user-1')

      expect(userFavoriteLabelRepository.save).toHaveBeenCalledWith({ userId: 'user-1', labelId: 'label-1' })
      expect(result).toHaveLength(1)
    })

    it('unfavLabel devrait supprimer puis retourner les favoris', async () => {
      userFavoriteLabelRepository.find.mockResolvedValue([])

      const result = await service.unfavLabel({ id: 'label-1' } as LabelEntity, 'user-1')

      expect(userFavoriteLabelRepository.delete).toHaveBeenCalledWith({ userId: 'user-1', labelId: 'label-1' })
      expect(result).toEqual([])
    })
  })

  describe('update', () => {
    it("devrait lever une NotFoundException si le label n'existe pas", async () => {
      labelRepository.findOne.mockResolvedValue(null)

      await expect(service.update('label-1', { name: 'new' })).rejects.toBeInstanceOf(NotFoundException)
    })

    it('devrait merger les updates dans le label existant et sauvegarder', async () => {
      const existing = { id: 'label-1', name: 'old', color: 'red' } as LabelEntity
      labelRepository.findOne.mockResolvedValue(existing)
      labelRepository.save.mockImplementation(async (l) => l as LabelEntity)

      const result = await service.update('label-1', { name: 'new' })

      expect(result.name).toBe('new')
      expect(result.color).toBe('red')
    })
  })

  describe('delete', () => {
    it("devrait lever une NotFoundException si le label n'existe pas", async () => {
      labelRepository.findOne.mockResolvedValue(null)

      await expect(service.delete('label-1')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('devrait supprimer les resourceLabels puis le label', async () => {
      labelRepository.findOne.mockResolvedValue({ id: 'label-1' } as LabelEntity)

      const result = await service.delete('label-1')

      expect(resourceLabelRepository.delete).toHaveBeenCalledWith({ labelId: 'label-1' })
      expect(labelRepository.delete).toHaveBeenCalledWith('label-1')
      expect(result).toBe(true)
    })
  })
})
