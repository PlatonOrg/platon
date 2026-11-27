import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRoles } from '@platon/core/common'
import { RolesGuard, RolesIfBodyHasKeyGuard } from './roles.guard'

const buildContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext)

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>
  let guard: RolesGuard

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>
    guard = new RolesGuard(reflector)
  })

  it("devrait autoriser l'accès si aucun rôle n'est requis", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)

    expect(guard.canActivate(buildContext({ user: { role: UserRoles.student } }))).toBe(true)
  })

  it("devrait autoriser l'accès si le rôle de l'utilisateur fait partie des rôles requis", () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoles.admin, UserRoles.teacher])

    expect(guard.canActivate(buildContext({ user: { role: UserRoles.teacher } }))).toBe(true)
  })

  it("devrait refuser l'accès si le rôle de l'utilisateur ne fait pas partie des rôles requis", () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoles.admin])

    expect(guard.canActivate(buildContext({ user: { role: UserRoles.student } }))).toBe(false)
  })

  it("devrait refuser l'accès si aucun utilisateur n'est présent sur la requête", () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoles.admin])

    expect(guard.canActivate(buildContext({}))).toBe(false)
  })
})

describe('RolesIfBodyHasKeyGuard', () => {
  let reflector: jest.Mocked<Reflector>
  let guard: RolesIfBodyHasKeyGuard

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>
    guard = new RolesIfBodyHasKeyGuard(reflector)
  })

  it("devrait autoriser l'accès si aucune métadonnée n'est définie", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)

    expect(guard.canActivate(buildContext({ body: { role: 'admin' } }))).toBe(true)
  })

  it("devrait autoriser l'accès si la requête n'a pas de corps", () => {
    reflector.getAllAndOverride.mockReturnValue([['role'], [UserRoles.admin]])

    expect(guard.canActivate(buildContext({}))).toBe(true)
  })

  it("devrait autoriser l'accès si le corps ne contient aucune des clés surveillées", () => {
    reflector.getAllAndOverride.mockReturnValue([['role'], [UserRoles.admin]])

    expect(guard.canActivate(buildContext({ body: { other: 'value' }, user: { role: UserRoles.student } }))).toBe(true)
  })

  it("devrait vérifier le rôle si le corps contient une des clés surveillées et l'autoriser si le rôle correspond", () => {
    reflector.getAllAndOverride.mockReturnValue([['role'], [UserRoles.admin]])

    expect(guard.canActivate(buildContext({ body: { role: 'admin' }, user: { role: UserRoles.admin } }))).toBe(true)
  })

  it("devrait refuser l'accès si le corps contient une des clés surveillées et que le rôle ne correspond pas", () => {
    reflector.getAllAndOverride.mockReturnValue([['role'], [UserRoles.admin]])

    expect(guard.canActivate(buildContext({ body: { role: 'admin' }, user: { role: UserRoles.student } }))).toBe(false)
  })
})
