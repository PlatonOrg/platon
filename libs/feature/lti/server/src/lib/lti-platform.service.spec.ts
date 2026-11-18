import { ConflictResponse, BadRequestResponse } from '@platon/core/common'
import { CreateLtiPlatform } from '@platon/feature/lti/common'
import { LtiPlatformDTO } from './lti-platform.dto'
import { LtiPlatformEntity } from './entities/lti-platform.entity'
import { LtiPlatformService } from './lti-platform.service'

describe('LtiPlatformService', () => {
  const input: CreateLtiPlatform = {
    name: 'Moodle',
    url: 'https://moodle.test',
    clientId: 'client-1',
    authenticationEndpoint: 'https://moodle.test/auth',
    accessTokenEndpoint: 'https://moodle.test/token',
    idTokenValidation: { method: 'JWK_SET', key: 'https://moodle.test/jwks' },
  }

  const manager = {
    registerPlatform: jest.fn(),
    deactivatePlatform: jest.fn(),
    getPlatformById: jest.fn(),
    updatePlatform: jest.fn(),
    activatePlatform: jest.fn(),
    deletePlatform: jest.fn(),
  }
  const platformRepo = { count: jest.fn(), findOne: jest.fn(), findAndCount: jest.fn() }
  const lmsRepo = { count: jest.fn() }
  const databaseManager = { runWithPlatformId: jest.fn((_id: string, fn: () => Promise<unknown>) => fn()) }
  const config = { get: jest.fn().mockReturnValue('https://platon.test') }

  const service = new LtiPlatformService(
    platformRepo as never,
    lmsRepo as never,
    databaseManager as never,
    { provider: { platformManager: manager } } as never,
    config as never
  )

  beforeEach(() => {
    jest.clearAllMocks()
    platformRepo.count.mockResolvedValue(0)
    platformRepo.findOne.mockResolvedValue({ id: 'p-1' })
    manager.registerPlatform.mockResolvedValue({ id: 'p-1' })
  })

  it('should create a platform with a generated id when no lmsId is given', async () => {
    await service.create(input)

    expect(manager.registerPlatform).toHaveBeenCalledWith(input)
    expect(databaseManager.runWithPlatformId).not.toHaveBeenCalled()
  })

  it('should reuse the LTI 1.1 LMS id when lmsId is given', async () => {
    lmsRepo.count.mockResolvedValue(1)

    await service.create({ ...input, lmsId: 'lms-1' })

    expect(databaseManager.runWithPlatformId).toHaveBeenCalledWith('lms-1', expect.any(Function))
    expect(manager.registerPlatform).toHaveBeenCalledWith(input)
  })

  it('should reject an lmsId that does not exist', async () => {
    lmsRepo.count.mockResolvedValue(0)

    await expect(service.create({ ...input, lmsId: 'lms-1' })).rejects.toBeInstanceOf(BadRequestResponse)
    expect(manager.registerPlatform).not.toHaveBeenCalled()
  })

  it('should reject an lmsId already used by a platform', async () => {
    lmsRepo.count.mockResolvedValue(1)
    platformRepo.count.mockResolvedValueOnce(1)

    await expect(service.create({ ...input, lmsId: 'lms-1' })).rejects.toBeInstanceOf(ConflictResponse)
    expect(manager.registerPlatform).not.toHaveBeenCalled()
  })

  it('should reject a duplicate url + clientId', async () => {
    platformRepo.count.mockResolvedValue(1)

    await expect(service.create(input)).rejects.toBeInstanceOf(ConflictResponse)
  })

  it('should deactivate the created platform when active = false', async () => {
    await service.create({ ...input, active: false })

    expect(manager.deactivatePlatform).toHaveBeenCalledWith({ id: 'p-1' })
  })

  it('should expose the URLs to enter in the LMS (without dynamic registration, which is disabled)', () => {
    expect(service.getToolConfig()).toEqual({
      loginUrl: 'https://platon.test/lti/login',
      launchUrl: 'https://platon.test/lti/launch',
      keysetUrl: 'https://platon.test/lti/keys',
    })
  })

  it('should never expose the private key in the DTO', () => {
    const entity = {
      id: 'p-1',
      name: 'Moodle',
      url: 'https://moodle.test',
      clientId: 'c',
      authenticationEndpoint: 'a',
      accessTokenEndpoint: 't',
      idTokenValidation: { method: 'JWK_SET', key: 'k' },
      active: true,
      publicKey: 'pub',
      privateKey: 'secret',
    } as LtiPlatformEntity

    expect(LtiPlatformDTO.fromEntity(entity)).not.toHaveProperty('privateKey')
  })
})
