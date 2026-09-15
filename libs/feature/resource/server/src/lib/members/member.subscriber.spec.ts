import { ResourceEventTypes } from '@platon/feature/resource/common'
import { DataSource } from 'typeorm'
import { ResourceMemberSubscriber } from './member.subscriber'

describe('ResourceMemberSubscriber', () => {
  let subscriber: ResourceMemberSubscriber
  let dataSource: { subscribers: unknown[] }

  const buildManager = (overrides: Record<string, unknown> = {}) => ({
    findOne: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    ...overrides,
  })

  beforeEach(() => {
    dataSource = { subscribers: [] }
    subscriber = new ResourceMemberSubscriber(dataSource as unknown as DataSource)
  })

  it("devrait s'enregistrer auprès du DataSource", () => {
    expect(dataSource.subscribers).toContain(subscriber)
  })

  describe('afterInsert', () => {
    it('ne devrait rien faire si la ressource associée est introuvable', async () => {
      const manager = buildManager()
      manager.findOne.mockResolvedValue(null)
      const event = { entity: { resourceId: 'r1', userId: 'u1', waiting: true }, manager }

      await subscriber.afterInsert(event as never)

      expect(manager.save).not.toHaveBeenCalled()
    })

    it("devrait journaliser l'adhésion et créer un watcher si l'utilisateur est en attente et n'observe pas déjà", async () => {
      const manager = buildManager()
      manager.findOne
        .mockResolvedValueOnce({ id: 'r1', name: 'Resource 1', type: 'CIRCLE' })
        .mockResolvedValueOnce(null)
      const event = { entity: { resourceId: 'r1', userId: 'u1', waiting: true, inviterId: 'admin-1' }, manager }

      await subscriber.afterInsert(event as never)

      const savedEntities = manager.save.mock.calls[0][0]
      expect(savedEntities).toHaveLength(2)
      expect(savedEntities[0]).toMatchObject({ type: ResourceEventTypes.MEMBER_CREATE })
    })

    it("ne devrait pas créer de watcher si l'utilisateur observe déjà la ressource", async () => {
      const manager = buildManager()
      manager.findOne
        .mockResolvedValueOnce({ id: 'r1', name: 'Resource 1', type: 'CIRCLE' })
        .mockResolvedValueOnce({ resourceId: 'r1', userId: 'u1' })
      const event = { entity: { resourceId: 'r1', userId: 'u1', waiting: true, inviterId: 'admin-1' }, manager }

      await subscriber.afterInsert(event as never)

      const savedEntities = manager.save.mock.calls[0][0]
      expect(savedEntities).toHaveLength(1)
    })

    it("ne devrait pas créer de watcher si l'adhésion n'est pas en attente", async () => {
      const manager = buildManager()
      manager.findOne
        .mockResolvedValueOnce({ id: 'r1', name: 'Resource 1', type: 'CIRCLE' })
        .mockResolvedValueOnce(null)
      const event = { entity: { resourceId: 'r1', userId: 'u1', waiting: false, inviterId: 'admin-1' }, manager }

      await subscriber.afterInsert(event as never)

      const savedEntities = manager.save.mock.calls[0][0]
      expect(savedEntities).toHaveLength(1)
    })
  })

  describe('afterUpdate', () => {
    it("ne devrait rien faire si la colonne waiting n'a pas changé", async () => {
      const manager = buildManager()
      const event = { entity: { resourceId: 'r1' }, updatedColumns: [{ propertyName: 'permissions' }], manager }

      await subscriber.afterUpdate(event as never)

      expect(manager.findOne).not.toHaveBeenCalled()
    })

    it('devrait journaliser le changement quand waiting change et que la ressource existe', async () => {
      const manager = buildManager()
      manager.findOne
        .mockResolvedValueOnce({ id: 'r1', name: 'Resource 1', type: 'CIRCLE' })
        .mockResolvedValueOnce(null)
      const event = {
        entity: { resourceId: 'r1', userId: 'u1', waiting: false, inviterId: 'admin-1' },
        updatedColumns: [{ propertyName: 'waiting' }],
        manager,
      }

      await subscriber.afterUpdate(event as never)

      expect(manager.save).toHaveBeenCalled()
    })
  })

  describe('afterRemove', () => {
    it("ne devrait rien faire si l'entité est absente", async () => {
      const manager = buildManager()
      const event = { entity: undefined, manager }

      await subscriber.afterRemove(event as never)

      expect(manager.save).not.toHaveBeenCalled()
    })

    it('devrait supprimer le watcher associé et journaliser le départ si la ressource existe', async () => {
      const manager = buildManager()
      manager.findOne.mockResolvedValue({ id: 'r1', name: 'Resource 1', type: 'CIRCLE', parentId: 'parent-1' })
      const event = { entity: { resourceId: 'r1', userId: 'u1' }, manager }

      await subscriber.afterRemove(event as never)

      expect(manager.delete).toHaveBeenCalledWith(expect.anything(), { resourceId: 'r1', userId: 'u1' })
      expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ type: ResourceEventTypes.MEMBER_REMOVE }))
    })

    it("ne devrait pas journaliser si la ressource n'existe plus", async () => {
      const manager = buildManager()
      manager.findOne.mockResolvedValue(null)
      const event = { entity: { resourceId: 'r1', userId: 'u1' }, manager }

      await subscriber.afterRemove(event as never)

      expect(manager.save).not.toHaveBeenCalled()
    })
  })
})
