import { UserService } from '@platon/core/server'
import { NotificationService } from '@platon/feature/notification/server'
import { ResourceEventTypes } from '@platon/feature/resource/common'
import { DataSource } from 'typeorm'
import { ResourceService } from '../resource.service'
import { ResourceEventSubscriber } from './event.subscriber'

describe('ResourceEventSubscriber', () => {
  let subscriber: ResourceEventSubscriber
  let dataSource: { subscribers: unknown[] }
  let userService: jest.Mocked<UserService>
  let resourceService: jest.Mocked<ResourceService>
  let notificationService: jest.Mocked<NotificationService>

  beforeEach(() => {
    dataSource = { subscribers: [] }
    userService = { search: jest.fn() } as unknown as jest.Mocked<UserService>
    resourceService = {
      notificationWatchers: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ResourceService>
    notificationService = {
      sendToAllUsers: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>
    subscriber = new ResourceEventSubscriber(
      dataSource as unknown as DataSource,
      userService,
      resourceService,
      notificationService
    )
  })

  it("devrait s'enregistrer auprès du DataSource", () => {
    expect(dataSource.subscribers).toContain(subscriber)
  })

  const buildEvent = (entity: Record<string, unknown> | undefined, manager: Record<string, unknown> = {}) => ({
    entity,
    manager,
  })

  it("ne devrait rien faire si l'entité est absente", async () => {
    await subscriber.afterInsert(buildEvent(undefined) as never)

    expect(notificationService.sendToAllUsers).not.toHaveBeenCalled()
  })

  it('ne devrait pas notifier un changement de statut envoyé sur le parent (pas la ressource cible)', async () => {
    const event = buildEvent({
      id: 'evt-1',
      type: ResourceEventTypes.RESOURCE_STATUS_CHANGE,
      resourceId: 'parent-1',
      data: { resourceId: 'target-1' },
    })

    await subscriber.afterInsert(event as never)

    expect(notificationService.sendToAllUsers).not.toHaveBeenCalled()
  })

  it('devrait notifier les observateurs pour un changement de statut de la ressource cible', async () => {
    resourceService.notificationWatchers.mockResolvedValue(['user-1', 'actor-1'])
    const event = buildEvent({
      id: 'evt-1',
      type: ResourceEventTypes.RESOURCE_STATUS_CHANGE,
      resourceId: 'target-1',
      actorId: 'actor-1',
      data: { resourceId: 'target-1' },
    })

    await subscriber.afterInsert(event as never)

    expect(notificationService.sendToAllUsers).toHaveBeenCalledWith(
      ['user-1'],
      expect.objectContaining({ type: 'RESOURCE-EVENT' })
    )
  })

  it("devrait notifier tous les admins pour une demande d'adhésion (auto-jointure)", async () => {
    userService.search.mockResolvedValue([[{ id: 'admin-1' }, { id: 'admin-2' }] as never, 2])
    const event = buildEvent({
      id: 'evt-1',
      type: ResourceEventTypes.MEMBER_CREATE,
      resourceId: 'r1',
      actorId: 'user-1',
      data: { userId: 'user-1' },
    })

    await subscriber.afterInsert(event as never)

    expect(userService.search).toHaveBeenCalledWith({ roles: ['admin'] })
    expect(notificationService.sendToAllUsers).toHaveBeenCalledWith(['admin-1', 'admin-2'], expect.anything())
  })

  it("devrait notifier les observateurs (hors acteur) pour une adhésion ajoutée par quelqu'un d'autre", async () => {
    resourceService.notificationWatchers.mockResolvedValue(['user-1', 'admin-1'])
    const event = buildEvent({
      id: 'evt-1',
      type: ResourceEventTypes.MEMBER_CREATE,
      resourceId: 'r1',
      actorId: 'admin-1',
      data: { userId: 'user-1' },
    })

    await subscriber.afterInsert(event as never)

    expect(notificationService.sendToAllUsers).toHaveBeenCalledWith(['user-1'], expect.anything())
  })

  it("devrait notifier uniquement l'acteur pour un retrait de membre", async () => {
    const event = buildEvent({
      id: 'evt-1',
      type: ResourceEventTypes.MEMBER_REMOVE,
      resourceId: 'r1',
      actorId: 'actor-1',
      data: {},
    })

    await subscriber.afterInsert(event as never)

    expect(notificationService.sendToAllUsers).toHaveBeenCalledWith(['actor-1'], expect.anything())
  })

  it("ne devrait pas laisser fuiter une erreur d'envoi de notification", async () => {
    notificationService.sendToAllUsers.mockRejectedValue(new Error('notif failed'))
    const event = buildEvent({
      id: 'evt-1',
      type: ResourceEventTypes.MEMBER_REMOVE,
      resourceId: 'r1',
      actorId: 'actor-1',
      data: {},
    })

    await expect(subscriber.afterInsert(event as never)).resolves.toBeUndefined()
  })
})
