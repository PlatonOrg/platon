import { NotificationService } from '@platon/feature/notification/server'
import { DataSource } from 'typeorm'
import { ResourceInvitationSubscriber } from './invitation.subscriber'

describe('ResourceInvitationSubscriber', () => {
  let subscriber: ResourceInvitationSubscriber
  let dataSource: { subscribers: unknown[] }
  let notificationService: jest.Mocked<NotificationService>

  beforeEach(() => {
    dataSource = { subscribers: [] }
    notificationService = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
      deleteWhere: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<NotificationService>
    subscriber = new ResourceInvitationSubscriber(dataSource as unknown as DataSource, notificationService)
  })

  it("devrait s'enregistrer auprès du DataSource", () => {
    expect(dataSource.subscribers).toContain(subscriber)
  })

  describe('afterInsert', () => {
    const buildManager = (overrides: Record<string, unknown> = {}) => ({
      findOne: jest.fn(),
      ...overrides,
    })

    it("ne devrait pas notifier si l'invitant est introuvable", async () => {
      const manager = buildManager()
      manager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'invitee-1' }).mockResolvedValueOnce({
        id: 'resource-1',
      })
      const event = { entity: { inviterId: 'inviter-1', inviteeId: 'invitee-1', resourceId: 'resource-1' }, manager }

      await subscriber.afterInsert(event as never)

      expect(notificationService.sendToUser).not.toHaveBeenCalled()
    })

    it('ne devrait pas notifier si la ressource est introuvable', async () => {
      const manager = buildManager()
      manager.findOne
        .mockResolvedValueOnce({ id: 'inviter-1', username: 'admin' })
        .mockResolvedValueOnce({ id: 'invitee-1', username: 'student' })
        .mockResolvedValueOnce(null)
      const event = { entity: { inviterId: 'inviter-1', inviteeId: 'invitee-1', resourceId: 'resource-1' }, manager }

      await subscriber.afterInsert(event as never)

      expect(notificationService.sendToUser).not.toHaveBeenCalled()
    })

    it("devrait notifier l'invité quand toutes les entités sont trouvées", async () => {
      const manager = buildManager()
      manager.findOne
        .mockResolvedValueOnce({ id: 'inviter-1', username: 'admin' })
        .mockResolvedValueOnce({ id: 'invitee-1', username: 'student' })
        .mockResolvedValueOnce({ id: 'resource-1', name: 'My resource', type: 'CIRCLE' })
      const event = {
        entity: { id: 'invitation-1', inviterId: 'inviter-1', inviteeId: 'invitee-1', resourceId: 'resource-1' },
        manager,
      }

      await subscriber.afterInsert(event as never)

      expect(notificationService.sendToUser).toHaveBeenCalledWith(
        'invitee-1',
        expect.objectContaining({
          type: 'RESOURCE-INVITATION',
          inviterName: 'admin',
          inviteeName: 'student',
          resourceName: 'My resource',
        })
      )
    })
  })

  describe('afterRemove', () => {
    it("ne devrait rien faire si l'entité est absente", async () => {
      await subscriber.afterRemove({ entity: undefined } as never)

      expect(notificationService.deleteWhere).not.toHaveBeenCalled()
    })

    it('devrait supprimer les notifications liées à cette invitation', async () => {
      const invitation = { inviteeId: 'invitee-1', resourceId: 'resource-1' }

      await subscriber.afterRemove({ entity: invitation } as never)

      expect(notificationService.deleteWhere).toHaveBeenCalledWith(
        'invitee-1',
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      )
    })
  })
})
