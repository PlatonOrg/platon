import { NotificationType } from '@platon/feature/notification/common'
import { NotificationType as GraphqlNotificationType } from './notification.graphql.generated'
import { decodeNotificationFragment } from './notification.graphql'

//test file for the convertion between "notification type" formats (graphql format vs the one we use)
describe('decodeNotificationFragment', () => {
  const fragment = (type: string) =>
    ({
      id: '1',
      createdAt: '2026-10-21T12:00:00Z',
      updatedAt: '2026-10-21T12:00:00Z',
      readAt: null,
      data: {},
      groupId: null,
      type,
      user: { id: 'user-1' },
    } as never)

  // Detect value that are in server side but not in the front side
  it.each(Object.values(GraphqlNotificationType))('devrait convertir le type GraphQL %s', (graphqlType) => {
    expect(() => decodeNotificationFragment(fragment(graphqlType))).not.toThrow()
  })

  // Detect value that are in front side but not in the server side
  it.each(Object.keys(NotificationType))('le type %s devrait exister dans le schéma GraphQL', (key) => {
    expect(Object.values(GraphqlNotificationType)).toContain(key)
  })

  it("devrait renvoyer la valeur de l'enum commun", () => {
    const result = decodeNotificationFragment(fragment(GraphqlNotificationType.ActivityClosed))
    expect(result.type).toBe(NotificationType.ACTIVITY_CLOSED)
  })

  it('devrait rejeter un type inconnu', () => {
    expect(() => decodeNotificationFragment(fragment('FOO'))).toThrow()
  })
})
