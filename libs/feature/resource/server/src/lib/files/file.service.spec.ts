import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundResponse } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { createUserEntity } from '@platon/core/testing/server'
import { ResourceTypes } from '@platon/feature/resource/common'
import { Optional } from 'typescript-optional'
import { ResourceDependencyService } from '../dependency'
import { ResourcePermissionService } from '../permissions/permissions.service'
import { ResourceEntity } from '../resource.entity'
import { ResourceService } from '../resource.service'
import { ResourceFileService } from './file.service'
import { Repo } from './repo'

jest.mock('./repo')

describe('ResourceFileService', () => {
  let service: ResourceFileService
  let resourceService: jest.Mocked<ResourceService>
  let permissionService: jest.Mocked<ResourcePermissionService>

  const fakeRepo = { copy: jest.fn(), read: jest.fn() }

  const buildResource = (overrides: Partial<ResourceEntity> = {}): ResourceEntity =>
    ({ id: 'resource-1', type: ResourceTypes.EXERCISE, ...overrides } as ResourceEntity)

  beforeEach(async () => {
    jest.clearAllMocks()
    ;(Repo.get as jest.Mock).mockResolvedValue(fakeRepo)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceFileService,
        {
          provide: ResourceService,
          useValue: { findByIdOrCode: jest.fn(), getPersonal: jest.fn() },
        },
        { provide: ResourcePermissionService, useValue: { userPermissionsOnResource: jest.fn() } },
        { provide: ResourceDependencyService, useValue: { getTemplateDependency: jest.fn() } },
      ],
    }).compile()

    service = module.get(ResourceFileService)
    resourceService = module.get(ResourceService)
    permissionService = module.get(ResourcePermissionService)
    permissionService.userPermissionsOnResource.mockResolvedValue({ read: true, write: true } as never)
  })

  describe('repo', () => {
    it('devrait résoudre la ressource par id/code quand un identifiant string est fourni', async () => {
      const resource = buildResource()
      resourceService.findByIdOrCode.mockResolvedValue(Optional.of(resource))

      const result = await service.repo('resource-1')

      expect(resourceService.findByIdOrCode).toHaveBeenCalledWith('resource-1')
      expect(result.resource).toBe(resource)
    })

    it("devrait rejeter avec NotFoundResponse si l'identifiant string ne correspond à aucune ressource", async () => {
      resourceService.findByIdOrCode.mockResolvedValue(Optional.empty())

      await expect(service.repo('unknown')).rejects.toBeInstanceOf(NotFoundResponse)
    })

    it("devrait utiliser directement l'entité fournie sans requête supplémentaire", async () => {
      const resource = buildResource()

      await service.repo(resource)

      expect(resourceService.findByIdOrCode).not.toHaveBeenCalled()
    })

    it('devrait résoudre le cercle personnel comme userCircle quand la requête a un utilisateur', async () => {
      const resource = buildResource()
      const user = createUserEntity({ id: 'user-1' })
      resourceService.getPersonal.mockResolvedValue(buildResource({ id: 'personal-circle' }))
      const req = { user } as unknown as IRequest

      await service.repo(resource, req)

      expect(resourceService.getPersonal).toHaveBeenCalledWith(user)
      expect(Repo.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userCircle: 'personal-circle' })
      )
    })

    it('ne devrait pas résoudre de userCircle sans requête', async () => {
      const resource = buildResource()

      await service.repo(resource)

      expect(resourceService.getPersonal).not.toHaveBeenCalled()
      expect(Repo.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ userCircle: undefined }))
    })

    it('devrait générer les fichiers par défaut du template quand templateId est défini et defaultFiles non fourni', async () => {
      const resource = buildResource({ templateId: 'template-1', templateVersion: 'v2' } as never)

      await service.repo(resource)

      const options = (Repo.get as jest.Mock).mock.calls[0][1]
      expect(Object.keys(options.defaultFiles)).toEqual(expect.arrayContaining(['main.ple', 'main.plo', 'readme.md']))
    })

    it('devrait utiliser les defaultFiles fournis en priorité même si templateId est défini', async () => {
      const resource = buildResource({ templateId: 'template-1' } as never)

      await service.repo(resource, undefined, { 'custom.txt': 'content' })

      const options = (Repo.get as jest.Mock).mock.calls[0][1]
      expect(options.defaultFiles).toEqual({ 'custom.txt': 'content' })
    })

    it('devrait mapper le type de ressource vers le bon répertoire', async () => {
      await service.repo(buildResource({ type: ResourceTypes.CIRCLE }))
      expect((Repo.get as jest.Mock).mock.calls[0][0]).toContain('circles')

      await service.repo(buildResource({ type: ResourceTypes.ACTIVITY }))
      expect((Repo.get as jest.Mock).mock.calls[1][0]).toContain('activites')
    })
  })

  describe('copy', () => {
    it('devrait copier le dépôt source vers le dépôt destination', async () => {
      const srcRepo = { copy: jest.fn() }
      const dstRepo = {}
      ;(Repo.get as jest.Mock).mockResolvedValueOnce(srcRepo).mockResolvedValueOnce(dstRepo)
      resourceService.findByIdOrCode.mockImplementation((id) => Promise.resolve(Optional.of(buildResource({ id }))))

      await service.copy('src-1', 'dst-1')

      expect(srcRepo.copy).toHaveBeenCalledWith(dstRepo)
    })
  })

  describe('getFileContent', () => {
    it('devrait lire le fichier à la version demandée et retourner son contenu', async () => {
      const content = new Uint8Array([1, 2, 3])
      fakeRepo.read.mockResolvedValue([{}, content])
      resourceService.findByIdOrCode.mockResolvedValue(Optional.of(buildResource()))

      const result = await service.getFileContent('resource-1', 'main.ple', 'v2')

      expect(fakeRepo.read).toHaveBeenCalledWith('main.ple', 'v2')
      expect(result).toBe(content)
    })

    it("devrait utiliser LATEST par défaut si aucune version n'est fournie", async () => {
      fakeRepo.read.mockResolvedValue([{}, new Uint8Array()])
      resourceService.findByIdOrCode.mockResolvedValue(Optional.of(buildResource()))

      await service.getFileContent('resource-1', 'main.ple')

      expect(fakeRepo.read).toHaveBeenCalledWith('main.ple', 'latest')
    })
  })

  describe('getTitle', () => {
    it('devrait retourner le nom de la ressource si trouvée', async () => {
      resourceService.findByIdOrCode.mockResolvedValue(Optional.of(buildResource({ name: 'My Resource' } as never)))

      const result = await service.getTitle('resource-1')

      expect(result).toBe('My Resource')
    })

    it('devrait retourner une valeur par défaut si la ressource est introuvable', async () => {
      resourceService.findByIdOrCode.mockResolvedValue(Optional.empty())

      const result = await service.getTitle('unknown')

      expect(result).toBe('À faire')
    })
  })
})
