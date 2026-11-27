import { Test, TestingModule } from '@nestjs/testing'
import { LevelController } from './level.controller'
import { LevelService } from './level.service'
import { LevelEntity } from './level.entity'

describe('LevelController', () => {
  let controller: LevelController
  let service: jest.Mocked<LevelService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LevelController],
      providers: [
        {
          provide: LevelService,
          useValue: { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get(LevelController)
    service = module.get(LevelService)
  })

  describe('list', () => {
    it('devrait retourner tous les niveaux mappés avec le total', async () => {
      const levels = [{ id: 'level-1', name: 'Niveau 1' }] as LevelEntity[]
      service.findAll.mockResolvedValue([levels, 1])

      const result = await controller.list()

      expect(result.total).toBe(1)
      expect(result.resources[0].name).toBe('Niveau 1')
    })
  })

  describe('create', () => {
    it("devrait créer un niveau et refléter le drapeau 'existing' dans la ressource", async () => {
      const level = { id: 'level-1', name: 'Niveau 1' } as LevelEntity
      service.create.mockResolvedValue({ level, existing: true })

      const result = await controller.create({ name: 'Niveau 1' })

      expect(service.create).toHaveBeenCalledWith({ name: 'Niveau 1' }, false)
      expect(result.resource.existing).toBe(true)
      expect(result.resource.name).toBe('Niveau 1')
    })

    it('devrait transmettre force=true au service quand demandé', async () => {
      const level = { id: 'level-1', name: 'Niveau 1' } as LevelEntity
      service.create.mockResolvedValue({ level, existing: false })

      await controller.create({ name: 'Niveau 1', force: true })

      expect(service.create).toHaveBeenCalledWith({ name: 'Niveau 1', force: true }, true)
    })
  })

  describe('update', () => {
    it('devrait déléguer au service et retourner la ressource mappée', async () => {
      const updated = { id: 'level-1', name: 'Renamed' } as LevelEntity
      service.update.mockResolvedValue(updated)

      const result = await controller.update('level-1', { name: 'Renamed' })

      expect(service.update).toHaveBeenCalledWith('level-1', { name: 'Renamed' })
      expect(result.resource.name).toBe('Renamed')
    })
  })

  describe('delete', () => {
    it('devrait déléguer la suppression au service', async () => {
      await controller.delete('level-1')

      expect(service.delete).toHaveBeenCalledWith('level-1')
    })
  })
})
