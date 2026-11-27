import { Test } from '@nestjs/testing'
import { ErrorResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { CorrectionLabel } from '@platon/feature/result/common'
import { Optional } from 'typescript-optional'
import { LabelController } from './label.controller'
import { LabelEntity } from './label.entity'
import { LabelService } from './label.service'
import { CorrectionLabelService } from './correction-label/correction-label.service'
import { ResourceLabelService } from './resource-label/resource-label.service'
import { ResourceLabelEntity } from './resource-label/resource-label.entity'

describe('LabelController', () => {
  let controller: LabelController
  let labelService: jest.Mocked<
    Pick<
      LabelService,
      'findById' | 'favLabel' | 'unfavLabel' | 'getUserFav' | 'list' | 'saveAndList' | 'delete' | 'update'
    >
  >
  let correctionLabelService: jest.Mocked<Pick<CorrectionLabelService, 'list'>>
  let resourceLabelService: jest.Mocked<Pick<ResourceLabelService, 'list' | 'update'>>

  beforeEach(async () => {
    labelService = {
      findById: jest.fn(),
      favLabel: jest.fn(),
      unfavLabel: jest.fn(),
      getUserFav: jest.fn(),
      list: jest.fn(),
      saveAndList: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    }
    correctionLabelService = { list: jest.fn() }
    resourceLabelService = { list: jest.fn(), update: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        LabelController,
        { provide: LabelService, useValue: labelService },
        { provide: CorrectionLabelService, useValue: correctionLabelService },
        { provide: ResourceLabelService, useValue: resourceLabelService },
      ],
    }).compile()

    controller = module.get(LabelController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('favLabel / unfavLabel', () => {
    it('favLabel devrait déléguer au service avec le label résolu', async () => {
      const req = { user: { id: 'user-1' } } as IRequest
      labelService.findById.mockResolvedValue(Optional.of({ id: 'label-1' } as LabelEntity))
      labelService.favLabel.mockResolvedValue([{ id: 'label-1' } as LabelEntity])

      const result = await controller.favLabel(req, 'label-1')

      expect(labelService.favLabel).toHaveBeenCalledWith({ id: 'label-1' }, 'user-1')
      expect(result.total).toBe(1)
    })

    it('unfavLabel devrait déléguer au service avec le label résolu', async () => {
      const req = { user: { id: 'user-1' } } as IRequest
      labelService.findById.mockResolvedValue(Optional.of({ id: 'label-1' } as LabelEntity))
      labelService.unfavLabel.mockResolvedValue([])

      const result = await controller.unfavLabel(req, 'label-1')

      expect(labelService.unfavLabel).toHaveBeenCalledWith({ id: 'label-1' }, 'user-1')
      expect(result.total).toBe(0)
    })
  })

  it("userFavLabelList devrait retourner les favoris de l'utilisateur courant", async () => {
    const req = { user: { id: 'user-1' } } as IRequest
    labelService.getUserFav.mockResolvedValue([{ id: 'label-1' } as LabelEntity])

    const result = await controller.userFavLabelList(req)

    expect(labelService.getUserFav).toHaveBeenCalledWith('user-1')
    expect(result.total).toBe(1)
  })

  describe('list', () => {
    it('devrait fusionner le gradeChange des resourceLabels dans les labels', async () => {
      resourceLabelService.list.mockResolvedValue([{ labelId: 'label-1', gradeChange: '10' } as ResourceLabelEntity])
      labelService.list.mockResolvedValue([{ id: 'label-1', name: 'A' } as LabelEntity])

      const result = await controller.list('nav-1')

      expect(result.resources[0].gradeChange).toBe('10')
    })

    it('devrait conserver le label tel quel sans resourceLabel correspondant', async () => {
      resourceLabelService.list.mockResolvedValue([])
      labelService.list.mockResolvedValue([{ id: 'label-1', name: 'A' } as LabelEntity])

      const result = await controller.list('nav-1')

      expect(result.resources[0].name).toBe('A')
    })
  })

  it('create devrait construire le CreateLabel depuis le body et déléguer', async () => {
    const req = { body: { name: 'A', color: 'red', description: 'desc' } } as IRequest
    labelService.saveAndList.mockResolvedValue([{ id: 'label-1' } as LabelEntity])

    const result = await controller.create(req, 'activity-1', 'ex-1')

    expect(labelService.saveAndList).toHaveBeenCalledWith(
      { name: 'A', color: 'red', description: 'desc' },
      'activity-1',
      'ex-1'
    )
    expect(result.total).toBe(1)
  })

  describe('listCorrectionLabels', () => {
    it('devrait retourner une liste vide sans sessionId ou answerId', async () => {
      const result = await controller.listCorrectionLabels('', 'answer-1')

      expect(result.total).toBe(0)
      expect(correctionLabelService.list).not.toHaveBeenCalled()
    })

    it('devrait mapper chaque correction label vers son label complet', async () => {
      correctionLabelService.list.mockResolvedValue([{ labelId: 'label-1' } as CorrectionLabel] as never)
      labelService.findById.mockResolvedValue(Optional.of({ id: 'label-1', name: 'A' } as LabelEntity))

      const result = await controller.listCorrectionLabels('session-1', 'answer-1')

      expect(result.total).toBe(1)
    })
  })

  describe('deleteLabel', () => {
    it("devrait lever une ErrorResponse 404 si le label n'existe pas", async () => {
      labelService.findById.mockResolvedValue(Optional.empty())

      await expect(controller.deleteLabel('label-1')).rejects.toBeInstanceOf(ErrorResponse)
    })

    it('devrait lever une ErrorResponse 500 si la suppression échoue', async () => {
      labelService.findById.mockResolvedValue(Optional.of({ id: 'label-1' } as LabelEntity))
      labelService.delete.mockRejectedValue(new Error('boom'))

      await expect(controller.deleteLabel('label-1')).rejects.toBeInstanceOf(ErrorResponse)
    })

    it('devrait supprimer le label et retourner une liste vide', async () => {
      labelService.findById.mockResolvedValue(Optional.of({ id: 'label-1' } as LabelEntity))
      labelService.delete.mockResolvedValue(true)

      const result = await controller.deleteLabel('label-1')

      expect(result.total).toBe(0)
    })
  })

  describe('updateLabel', () => {
    it("devrait lever une ErrorResponse 404 si le label n'existe pas", async () => {
      labelService.findById.mockResolvedValue(Optional.empty())
      const req = { body: { id: 'label-1' } } as IRequest

      await expect(controller.updateLabel('nav-1', req)).rejects.toBeInstanceOf(ErrorResponse)
    })

    it('devrait mettre à jour le resourceLabel puis le label', async () => {
      const label = { id: 'label-1', name: 'old', description: 'old', color: 'red' } as LabelEntity
      labelService.findById.mockResolvedValue(Optional.of(label))
      labelService.update.mockResolvedValue({ ...label, name: 'new' } as LabelEntity)
      const req = {
        body: { id: 'label-1', name: 'new', description: 'desc', color: 'blue', gradeChange: '5' },
      } as IRequest

      const result = await controller.updateLabel('nav-1', req)

      expect(resourceLabelService.update).toHaveBeenCalledWith('label-1', 'nav-1', '5')
      expect(labelService.update).toHaveBeenCalledWith('label-1', expect.objectContaining({ name: 'new' }))
      expect(result.name).toBe('new')
    })

    it('devrait lever une ErrorResponse 500 si la mise à jour échoue', async () => {
      const label = { id: 'label-1', name: 'old' } as LabelEntity
      labelService.findById.mockResolvedValue(Optional.of(label))
      resourceLabelService.update.mockRejectedValue(new Error('boom'))
      const req = { body: { id: 'label-1', name: 'new', description: 'desc', color: 'blue' } } as IRequest

      await expect(controller.updateLabel('nav-1', req)).rejects.toBeInstanceOf(ErrorResponse)
    })
  })
})
