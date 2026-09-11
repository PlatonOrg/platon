import { Test, TestingModule } from '@nestjs/testing'
import { IRequest } from '@platon/core/server'
import { UserRoles } from '@platon/core/common'
import { createUserEntity } from '@platon/core/testing/server'
import { ResourceMember, ResourceTypes } from '@platon/feature/resource/common'
import { ResourceMemberEntity, ResourceMemberService } from '../members'
import { ResourceEntity } from '../resource.entity'
import { ResourceService } from '../resource.service'
import { ResourceWatcherEntity, ResourceWatcherService } from '../watchers'
import { ResourcePermissionService } from './permissions.service'

describe('ResourcePermissionService', () => {
  let service: ResourcePermissionService
  let memberService: jest.Mocked<ResourceMemberService>
  let watcherService: jest.Mocked<ResourceWatcherService>
  let resourceService: jest.Mocked<ResourceService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcePermissionService,
        { provide: ResourceMemberService, useValue: { findAllByUserId: jest.fn().mockResolvedValue([]) } },
        { provide: ResourceWatcherService, useValue: { findAllByUserId: jest.fn().mockResolvedValue([]) } },
        {
          provide: ResourceService,
          useValue: {
            getById: jest.fn(),
            getDescendants: jest.fn().mockResolvedValue([]),
            getParents: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile()

    service = module.get(ResourcePermissionService)
    memberService = module.get(ResourceMemberService)
    watcherService = module.get(ResourceWatcherService)
    resourceService = module.get(ResourceService)
  })

  const buildCircle = (overrides: Partial<ResourceEntity> = {}): ResourceEntity =>
    ({
      id: 'circle-1',
      type: ResourceTypes.CIRCLE,
      personal: false,
      ownerId: 'owner-1',
      ...overrides,
    } as ResourceEntity)

  const buildReq = (user: ReturnType<typeof createUserEntity>): IRequest =>
    ({ user, memoize: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()) } as unknown as IRequest)

  const buildMembership = (overrides: Partial<ResourceMember> = {}): ResourceMemberEntity =>
    ({ resourceId: 'circle-1', userId: 'user-1', waiting: false, ...overrides } as ResourceMemberEntity)

  describe('userPermissionsOnResource', () => {
    it("devrait retourner des permissions vides si la requête n'a pas d'utilisateur", async () => {
      const result = await service.userPermissionsOnResource({ resource: buildCircle(), req: undefined })

      expect(result).toEqual({ read: false, write: false, member: false, watcher: false, waiting: false })
    })

    it('devrait autoriser la lecture sur un cercle non personnel sans condition', async () => {
      const user = createUserEntity({ id: 'stranger', role: UserRoles.student })
      const circle = buildCircle({ personal: false })
      const req = buildReq(user)

      const result = await service.userPermissionsOnResource({ req, resource: circle })

      expect(result.read).toBe(true)
    })

    describe('lecture sur un cercle personnel', () => {
      it('devrait autoriser le propriétaire', async () => {
        const owner = createUserEntity({ id: 'owner-1', role: UserRoles.student })
        const circle = buildCircle({ personal: true, ownerId: 'owner-1' })
        const req = buildReq(owner)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.read).toBe(true)
      })

      it('devrait autoriser un membre du cercle', async () => {
        const user = createUserEntity({ id: 'member-1', role: UserRoles.student })
        memberService.findAllByUserId.mockResolvedValue([buildMembership({ resourceId: 'circle-1' })])
        const circle = buildCircle({ personal: true, ownerId: 'owner-1' })
        const req = buildReq(user)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.read).toBe(true)
      })

      it("devrait autoriser un membre d'un cercle descendant", async () => {
        const user = createUserEntity({ id: 'member-1', role: UserRoles.student })
        memberService.findAllByUserId.mockResolvedValue([buildMembership({ resourceId: 'descendant-1' })])
        resourceService.getDescendants.mockResolvedValue([buildCircle({ id: 'descendant-1' })])
        const circle = buildCircle({ personal: true, ownerId: 'owner-1' })
        const req = buildReq(user)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.read).toBe(true)
      })

      it('devrait refuser un utilisateur sans lien avec le cercle', async () => {
        const stranger = createUserEntity({ id: 'stranger', role: UserRoles.student })
        const circle = buildCircle({ personal: true, ownerId: 'owner-1' })
        const req = buildReq(stranger)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.read).toBe(false)
      })
    })

    describe('écriture', () => {
      it('devrait autoriser le propriétaire du cercle', async () => {
        const owner = createUserEntity({ id: 'owner-1', role: UserRoles.student })
        const circle = buildCircle({ ownerId: 'owner-1' })
        const req = buildReq(owner)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.write).toBe(true)
      })

      it('devrait autoriser un admin sur un cercle non personnel', async () => {
        const admin = createUserEntity({ id: 'admin-1', role: UserRoles.admin })
        const circle = buildCircle({ personal: false, ownerId: 'someone-else' })
        const req = buildReq(admin)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.write).toBe(true)
      })

      it('ne devrait pas autoriser un admin sur un cercle personnel via la seule règle admin', async () => {
        const admin = createUserEntity({ id: 'admin-1', role: UserRoles.admin })
        const circle = buildCircle({ personal: true, ownerId: 'someone-else' })
        const req = buildReq(admin)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.write).toBe(false)
      })

      it('devrait autoriser un membre non-waiting du cercle', async () => {
        const user = createUserEntity({ id: 'member-1', role: UserRoles.student })
        memberService.findAllByUserId.mockResolvedValue([buildMembership({ resourceId: 'circle-1', waiting: false })])
        const circle = buildCircle({ ownerId: 'someone-else' })
        const req = buildReq(user)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.write).toBe(true)
      })

      it('ne devrait pas autoriser un membre en attente (waiting) du cercle', async () => {
        const user = createUserEntity({ id: 'member-1', role: UserRoles.student })
        memberService.findAllByUserId.mockResolvedValue([buildMembership({ resourceId: 'circle-1', waiting: true })])
        resourceService.getParents.mockResolvedValue([])
        const circle = buildCircle({ ownerId: 'someone-else' })
        const req = buildReq(user)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.write).toBe(false)
        expect(result.waiting).toBe(true)
      })

      it("devrait autoriser via l'appartenance à un cercle parent non personnel", async () => {
        const user = createUserEntity({ id: 'member-1', role: UserRoles.student })
        const circle = buildCircle({ personal: false, ownerId: 'someone-else' })
        const parent = buildCircle({ id: 'parent-1', ownerId: 'someone-else' })
        resourceService.getParents.mockResolvedValue([parent])
        memberService.findAllByUserId.mockResolvedValue([buildMembership({ resourceId: 'parent-1' })])
        const req = buildReq(user)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.write).toBe(true)
      })

      it("ne devrait pas consulter les parents si le cercle est personnel et n'appartient pas à l'utilisateur", async () => {
        const stranger = createUserEntity({ id: 'stranger', role: UserRoles.student })
        const circle = buildCircle({ personal: true, ownerId: 'owner-1' })
        const req = buildReq(stranger)

        const result = await service.userPermissionsOnResource({ req, resource: circle })

        expect(result.write).toBe(false)
        expect(resourceService.getParents).not.toHaveBeenCalled()
      })
    })

    it('devrait résoudre le cercle parent pour une ressource non-cercle', async () => {
      const user = createUserEntity({ id: 'owner-1', role: UserRoles.student })
      const exercise = { id: 'exercise-1', type: ResourceTypes.EXERCISE, parentId: 'circle-1' } as ResourceEntity
      resourceService.getById.mockResolvedValue(buildCircle({ ownerId: 'owner-1' }))
      const req = buildReq(user)

      const result = await service.userPermissionsOnResource({ req, resource: exercise })

      expect(resourceService.getById).toHaveBeenCalledWith('circle-1', false)
      expect(result.write).toBe(true)
    })

    it("devrait indiquer watcher=true si l'utilisateur observe la ressource", async () => {
      const user = createUserEntity({ id: 'watcher-1', role: UserRoles.student })
      watcherService.findAllByUserId.mockResolvedValue([{ resourceId: 'circle-1' } as ResourceWatcherEntity])
      const circle = buildCircle()
      const req = buildReq(user)

      const result = await service.userPermissionsOnResource({ req, resource: circle })

      expect(result.watcher).toBe(true)
    })

    it("devrait indiquer member=true si l'utilisateur est membre de la ressource elle-même", async () => {
      const user = createUserEntity({ id: 'member-1', role: UserRoles.student })
      memberService.findAllByUserId.mockResolvedValue([buildMembership({ resourceId: 'circle-1' })])
      const circle = buildCircle()
      const req = buildReq(user)

      const result = await service.userPermissionsOnResource({ req, resource: circle })

      expect(result.member).toBe(true)
    })
  })

  describe('userPermissionsOnResources', () => {
    it('devrait calculer les permissions pour chaque ressource fournie', async () => {
      const user = createUserEntity({ id: 'owner-1', role: UserRoles.student })
      const circle1 = buildCircle({ id: 'circle-1', ownerId: 'owner-1' })
      const circle2 = buildCircle({ id: 'circle-2', ownerId: 'someone-else', personal: false })
      const req = buildReq(user)

      const result = await service.userPermissionsOnResources([circle1, circle2], req)

      expect(result).toHaveLength(2)
      expect(result[0].permissions.write).toBe(true)
      expect(result[1].permissions.write).toBe(false)
    })
  })
})
