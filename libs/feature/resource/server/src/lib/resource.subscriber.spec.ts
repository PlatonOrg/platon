import { IRequest } from '@platon/core/server'
import { ResourceEventTypes } from '@platon/feature/resource/common'
import { DataSource } from 'typeorm'
import { ResourceService } from './resource.service'
import { ResourceSubscriber } from './resource.subscriber'

describe('ResourceSubscriber', () => {
  let subscriber: ResourceSubscriber
  let resourceService: jest.Mocked<ResourceService>
  let dataSource: { subscribers: unknown[] }
  let request: IRequest

  const buildManager = () => ({
    save: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((_entity: unknown, data: unknown) => data),
  })

  beforeEach(() => {
    resourceService = { getById: jest.fn() } as unknown as jest.Mocked<ResourceService>
    dataSource = { subscribers: [] }
    request = { user: { id: 'user-1' } } as unknown as IRequest
    subscriber = new ResourceSubscriber(resourceService, dataSource as unknown as DataSource, request)
  })

  it("devrait s'enregistrer auprès du DataSource", () => {
    expect(dataSource.subscribers).toContain(subscriber)
  })

  describe('afterInsert', () => {
    it('devrait toujours créer un watcher pour le propriétaire', async () => {
      const manager = buildManager()
      const event = { entity: { id: 'res-1', ownerId: 'owner-1' }, manager }

      await subscriber.afterInsert(event as never)

      expect(manager.create).toHaveBeenCalledWith(expect.anything(), { resourceId: 'res-1', userId: 'owner-1' })
    })

    it('devrait créer un événement de création si la ressource a un parent', async () => {
      resourceService.getById.mockResolvedValue({ name: 'Parent circle' } as never)
      const manager = buildManager()
      const event = {
        entity: { id: 'res-1', ownerId: 'owner-1', parentId: 'parent-1', type: 'EXERCISE', name: 'Exo' },
        manager,
      }

      await subscriber.afterInsert(event as never)

      expect(resourceService.getById).toHaveBeenCalledWith('parent-1')
      expect(manager.save).toHaveBeenCalledTimes(2)
      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: ResourceEventTypes.RESOURCE_CREATE })
      )
    })

    it("ne devrait pas créer d'événement si la ressource n'a pas de parent", async () => {
      const manager = buildManager()
      const event = { entity: { id: 'res-1', ownerId: 'owner-1' }, manager }

      await subscriber.afterInsert(event as never)

      expect(resourceService.getById).not.toHaveBeenCalled()
      expect(manager.save).toHaveBeenCalledTimes(1)
    })
  })

  describe('afterUpdate', () => {
    it("ne devrait rien faire si le statut n'a pas changé", async () => {
      const manager = buildManager()
      const event = { entity: { id: 'res-1' }, updatedColumns: [{ propertyName: 'name' }], manager }

      await subscriber.afterUpdate(event as never)

      expect(manager.save).not.toHaveBeenCalled()
    })

    it("devrait créer un événement de changement de statut sans appeler getById si la ressource n'a pas de parent", async () => {
      const manager = buildManager()
      const event = {
        entity: { id: 'res-1', type: 'EXERCISE', name: 'Exo', status: 'READY', parentId: undefined },
        updatedColumns: [{ propertyName: 'status' }],
        manager,
      }

      await subscriber.afterUpdate(event as never)

      // Régression : getById(undefined) fait un WHERE id = NULL en base réelle, qui échoue
      // toujours avec EntityNotFoundError (getOneOrFail) — donc ne doit jamais être appelé ici.
      expect(resourceService.getById).not.toHaveBeenCalled()
      expect(manager.save).toHaveBeenCalledTimes(1)
      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: ResourceEventTypes.RESOURCE_STATUS_CHANGE, actorId: 'user-1' })
      )
    })

    it('devrait aussi créer un événement pour le parent si parentId est défini', async () => {
      resourceService.getById.mockResolvedValue({ name: 'Parent circle' } as never)
      const manager = buildManager()
      const event = {
        entity: {
          id: 'res-1',
          type: 'EXERCISE',
          name: 'Exo',
          status: 'READY',
          parentId: 'parent-1',
          parentName: 'Parent circle',
        },
        updatedColumns: [{ propertyName: 'status' }],
        manager,
      }

      await subscriber.afterUpdate(event as never)

      expect(manager.save).toHaveBeenCalledTimes(2)
    })
  })
})
