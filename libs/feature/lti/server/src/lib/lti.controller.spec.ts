import { Test } from '@nestjs/testing'
import { NotFoundResponse } from '@platon/core/common'
import { Optional } from 'typescript-optional'
import { LmsEntity } from './entities/lms.entity'
import { LTIController } from './lti.controller'
import { LTIService } from './lti.service'

describe('LTIController', () => {
  let controller: LTIController
  let service: jest.Mocked<Pick<LTIService, 'searchLMS' | 'findLmsById' | 'createLms' | 'updateLms' | 'deleteLms'>>

  beforeEach(async () => {
    service = {
      searchLMS: jest.fn(),
      findLmsById: jest.fn(),
      createLms: jest.fn(),
      updateLms: jest.fn(),
      deleteLms: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [LTIController, { provide: LTIService, useValue: service }],
    }).compile()

    controller = module.get(LTIController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('searchLms', () => {
    it('devrait retourner la liste mappée des LMS', async () => {
      const lms = { id: 'id-1', name: 'Moodle' } as LmsEntity
      service.searchLMS.mockResolvedValue([[lms], 1])

      const result = await controller.searchLms({})

      expect(service.searchLMS).toHaveBeenCalledWith({})
      expect(result.total).toBe(1)
      expect(result.resources).toHaveLength(1)
      expect(result.resources[0].name).toBe('Moodle')
    })
  })

  describe('findLms', () => {
    it('devrait retourner le LMS trouvé', async () => {
      const lms = { id: 'id-1', name: 'Moodle' } as LmsEntity
      service.findLmsById.mockResolvedValue(Optional.of(lms))

      const result = await controller.findLms('id-1')

      expect(result.resource.name).toBe('Moodle')
    })

    it("devrait lever une NotFoundResponse si le LMS n'existe pas", async () => {
      service.findLmsById.mockResolvedValue(Optional.empty())

      await expect(controller.findLms('missing')).rejects.toBeInstanceOf(NotFoundResponse)
    })
  })

  describe('createLms', () => {
    it('devrait créer un LMS et retourner la ressource mappée', async () => {
      const lms = { id: 'id-1', name: 'Moodle' } as LmsEntity
      service.createLms.mockResolvedValue(lms)

      const result = await controller.createLms({
        name: 'Moodle',
        url: 'https://x.com',
        outcomeUrl: 'https://x.com/outcome',
        consumerKey: 'key',
        consumerSecret: 'secret',
      })

      expect(service.createLms).toHaveBeenCalled()
      expect(result.resource.name).toBe('Moodle')
    })
  })

  describe('updateLms', () => {
    it('devrait mettre à jour le LMS et retourner la ressource mappée', async () => {
      const lms = { id: 'id-1', name: 'New name' } as LmsEntity
      service.updateLms.mockResolvedValue(lms)

      const result = await controller.updateLms('id-1', { name: 'New name' })

      expect(service.updateLms).toHaveBeenCalledWith('id-1', { name: 'New name' })
      expect(result.resource.name).toBe('New name')
    })
  })

  describe('deleteLms', () => {
    it('devrait supprimer le LMS', async () => {
      await controller.deleteLms('id-1')

      expect(service.deleteLms).toHaveBeenCalledWith('id-1')
    })
  })
})
