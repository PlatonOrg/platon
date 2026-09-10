import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Test, TestingModule } from '@nestjs/testing'
import { BaseEntity } from 'typeorm'
import { DatabaseService } from './database.service'
import { VIRTUAL_COLUMNS_RESOLVER, VirtualColumnResolver } from './database.decorators'
import { createUserEntity } from '@platon/core/testing/server'

describe('DatabaseService', () => {
  let service: DatabaseService
  let discovery: jest.Mocked<DiscoveryService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService, { provide: DiscoveryService, useValue: { providersWithMetaAtKey: jest.fn() } }],
    }).compile()

    service = module.get(DatabaseService)
    discovery = module.get(DiscoveryService)
  })

  describe('onModuleInit + resolveVirtualColumns', () => {
    it("devrait enregistrer les resolvers découverts et les invoquer pour l'entité correspondante", async () => {
      const resolve = jest.fn().mockResolvedValue(undefined)
      const resolver: VirtualColumnResolver<BaseEntity> = { resolve }
      discovery.providersWithMetaAtKey.mockResolvedValue([
        { meta: 'SomeEntity', discoveredClass: { instance: resolver } } as never,
      ])

      await service.onModuleInit()
      const entities = [{} as BaseEntity]
      const user = createUserEntity()
      await service.resolveVirtualColumns('SomeEntity' as never, entities, user as never)

      expect(discovery.providersWithMetaAtKey).toHaveBeenCalledWith(VIRTUAL_COLUMNS_RESOLVER)
      expect(resolve).toHaveBeenCalledWith(entities, user)
    })

    it("ne devrait rien faire si aucun resolver n'est enregistré pour la cible", async () => {
      discovery.providersWithMetaAtKey.mockResolvedValue([])

      await service.onModuleInit()

      await expect(
        service.resolveVirtualColumns('UnknownEntity' as never, [], createUserEntity() as never)
      ).resolves.toBeUndefined()
    })
  })
})
