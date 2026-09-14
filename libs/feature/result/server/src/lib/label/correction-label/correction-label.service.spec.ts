import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { CorrectionLabelEntity } from './correction-label.entity'
import { CorrectionLabelService } from './correction-label.service'
import { ResourceLabelEntity } from '../resource-label/resource-label.entity'

describe('CorrectionLabelService', () => {
  let service: CorrectionLabelService
  let correctionLabelRepository: MockRepository<CorrectionLabelEntity>
  let resourceLabelRepository: MockRepository<ResourceLabelEntity>

  beforeEach(async () => {
    correctionLabelRepository = mockRepository<CorrectionLabelEntity>()
    resourceLabelRepository = mockRepository<ResourceLabelEntity>()

    const module = await Test.createTestingModule({
      providers: [
        CorrectionLabelService,
        { provide: getRepositoryToken(CorrectionLabelEntity), useValue: correctionLabelRepository },
        { provide: getRepositoryToken(ResourceLabelEntity), useValue: resourceLabelRepository },
      ],
    }).compile()

    service = module.get(CorrectionLabelService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('devrait retourner un tableau vide sans sessionId ou answerId', async () => {
      expect(await service.list('', 'answer-1')).toEqual([])
      expect(correctionLabelRepository.find).not.toHaveBeenCalled()
    })

    it('devrait retourner les labels de correction pour la session/answer donnée', async () => {
      correctionLabelRepository.find.mockResolvedValue([{ id: 'cl1' }] as CorrectionLabelEntity[])

      const result = await service.list('session-1', 'answer-1')

      expect(correctionLabelRepository.find).toHaveBeenCalledWith({
        where: { sessionId: 'session-1', answerId: 'answer-1' },
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('labelize', () => {
    it('devrait retourner un tableau vide si un paramètre requis manque', async () => {
      expect(await service.labelize('', 'answer-1', 'label-1', 'correction-1')).toEqual([])
      expect(correctionLabelRepository.findOne).not.toHaveBeenCalled()
    })

    it('devrait retourner la liste existante sans créer de doublon', async () => {
      correctionLabelRepository.findOne.mockResolvedValue({ id: 'existing' } as CorrectionLabelEntity)
      correctionLabelRepository.find.mockResolvedValue([{ id: 'existing' }] as CorrectionLabelEntity[])

      const result = await service.labelize('session-1', 'answer-1', 'label-1', 'correction-1')

      expect(correctionLabelRepository.save).not.toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('devrait créer un label de correction sans resourceLabel associé', async () => {
      correctionLabelRepository.findOne.mockResolvedValue(null)
      resourceLabelRepository.findOne.mockResolvedValue(null)
      correctionLabelRepository.find.mockResolvedValue([])

      await service.labelize('session-1', 'answer-1', 'label-1', 'correction-1')

      expect(correctionLabelRepository.save).toHaveBeenCalledWith({
        sessionId: 'session-1',
        answerId: 'answer-1',
        labelId: 'label-1',
        correctionId: 'correction-1',
      })
    })

    it('devrait créer un label de correction avec le resourceLabel associé', async () => {
      const resourceLabel = { id: 'rl1' } as ResourceLabelEntity
      correctionLabelRepository.findOne.mockResolvedValue(null)
      resourceLabelRepository.findOne.mockResolvedValue(resourceLabel)
      correctionLabelRepository.find.mockResolvedValue([])

      await service.labelize('session-1', 'answer-1', 'label-1', 'correction-1')

      expect(correctionLabelRepository.save).toHaveBeenCalledWith({
        sessionId: 'session-1',
        answerId: 'answer-1',
        labelId: 'label-1',
        resourceLabel,
        correctionId: 'correction-1',
      })
    })
  })
})
