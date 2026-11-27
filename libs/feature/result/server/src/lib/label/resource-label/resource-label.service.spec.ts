import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { ResourceLabelEntity } from './resource-label.entity'
import { ResourceLabelService } from './resource-label.service'

describe('ResourceLabelService', () => {
  let service: ResourceLabelService
  let repository: MockRepository<ResourceLabelEntity>

  beforeEach(async () => {
    repository = mockRepository<ResourceLabelEntity>()

    const module = await Test.createTestingModule({
      providers: [ResourceLabelService, { provide: getRepositoryToken(ResourceLabelEntity), useValue: repository }],
    }).compile()

    service = module.get(ResourceLabelService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('update', () => {
    it("ne devrait rien faire si le resource label n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await service.update('label-1', 'nav-1', '5')

      expect(repository.save).not.toHaveBeenCalled()
    })

    it('devrait mettre à jour le gradeChange et sauvegarder', async () => {
      const label = { id: 'rl1', gradeChange: undefined } as unknown as ResourceLabelEntity
      repository.findOne.mockResolvedValue(label)

      await service.update('label-1', 'nav-1', '5')

      expect(label.gradeChange).toBe('5')
      expect(repository.save).toHaveBeenCalledWith(label)
    })
  })

  describe('list', () => {
    it("devrait retourner les resource labels d'un navigationExerciseId", async () => {
      repository.find.mockResolvedValue([{ id: 'rl1' }] as ResourceLabelEntity[])

      const result = await service.list('nav-1')

      expect(repository.find).toHaveBeenCalledWith({ where: { navigationExerciseId: 'nav-1' } })
      expect(result).toHaveLength(1)
    })
  })

  describe('findById', () => {
    it('devrait retourner Optional.empty si non trouvé', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findById('rl1')

      expect(result.isPresent()).toBe(false)
    })

    it('devrait retourner Optional.of si trouvé', async () => {
      repository.findOne.mockResolvedValue({ id: 'rl1' } as ResourceLabelEntity)

      const result = await service.findById('rl1')

      expect(result.isPresent()).toBe(true)
    })
  })
})
