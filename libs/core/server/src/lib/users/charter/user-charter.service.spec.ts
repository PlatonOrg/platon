import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MockRepository, mockRepository } from '@platon/core/testing/server'
import { UserCharterEntity } from './user-charter.entity'
import { UserCharterService } from './user-charter.service'

describe('UserCharterService', () => {
  let service: UserCharterService
  let repository: MockRepository<UserCharterEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCharterService,
        { provide: getRepositoryToken(UserCharterEntity), useValue: mockRepository<UserCharterEntity>() },
      ],
    }).compile()

    service = module.get(UserCharterService)
    repository = module.get(getRepositoryToken(UserCharterEntity))
  })

  describe('acceptUserCharter', () => {
    it("devrait marquer la charte comme acceptée puis retourner l'entité à jour", async () => {
      const charter = { id: 'user-1', acceptedUserCharter: true } as UserCharterEntity
      repository.findOne.mockResolvedValue(charter)

      const result = await service.acceptUserCharter('user-1')

      expect(repository.update).toHaveBeenCalledWith('user-1', { acceptedUserCharter: true })
      expect(result).toBe(charter)
    })
  })

  describe('findUserCharterById', () => {
    it('devrait retourner la charte existante', async () => {
      const charter = { id: 'user-1', acceptedUserCharter: false } as UserCharterEntity
      repository.findOne.mockResolvedValue(charter)

      const result = await service.findUserCharterById('user-1')

      expect(repository.save).not.toHaveBeenCalled()
      expect(result).toBe(charter)
    })

    it("devrait créer une charte non acceptée si elle n'existe pas encore", async () => {
      repository.findOne.mockResolvedValue(null)
      const created = { id: 'user-1', acceptedUserCharter: false } as UserCharterEntity
      repository.create.mockReturnValue(created)
      repository.save.mockResolvedValue(created)

      const result = await service.findUserCharterById('user-1')

      expect(repository.create).toHaveBeenCalledWith({ id: 'user-1', acceptedUserCharter: false })
      expect(result).toBe(created)
    })
  })
})
