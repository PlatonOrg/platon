import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { BadRequestResponse, UnauthorizedResponse } from '@platon/core/common'
import { EventService, IRequest } from '@platon/core/server'
import { ResourceTypes } from '@platon/feature/resource/common'
import { ResourceDependencyService } from '../dependency'
import { ResourceEntity } from '../resource.entity'
import { ResourceFileController } from './file.controller'
import { ResourceFileService } from './file.service'

describe('ResourceFileController', () => {
  let controller: ResourceFileController
  let fileService: jest.Mocked<ResourceFileService>
  let eventService: jest.Mocked<EventService>
  let dependencyService: jest.Mocked<ResourceDependencyService>

  const buildResource = (overrides: Partial<ResourceEntity> = {}): ResourceEntity =>
    ({ id: 'resource-1', name: 'Resource 1', type: ResourceTypes.EXERCISE, ...overrides } as ResourceEntity)

  const buildRepo = (overrides: Record<string, unknown> = {}) => ({
    log: jest.fn(),
    release: jest.fn(),
    versions: jest.fn(),
    listZipFiles: jest.fn(),
    describe: jest.fn(),
    search: jest.fn(),
    read: jest.fn(),
    write: jest.fn(),
    upload: jest.fn(),
    withNoCommit: jest.fn((fn: () => Promise<void>) => fn()),
    touch: jest.fn(),
    mkdir: jest.fn(),
    commit: jest.fn(),
    unzip: jest.fn(),
    unzipFile: jest.fn(),
    rename: jest.fn(),
    move: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  })

  const buildReq = (params: Record<string, string> = {}, overrides: Record<string, unknown> = {}): IRequest =>
    ({
      params: { path: '', ...params },
      user: { id: 'user-1', role: 'teacher', ...overrides },
    } as unknown as IRequest)

  const buildRes = () => ({ set: jest.fn() } as never)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceFileController],
      providers: [
        { provide: ResourceFileService, useValue: { repo: jest.fn(), compile: jest.fn() } },
        { provide: EventService, useValue: { emit: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(3600) } },
        {
          provide: ResourceDependencyService,
          useValue: { createDependencyForNewVersion: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get(ResourceFileController)
    fileService = module.get(ResourceFileService)
    eventService = module.get(EventService)
    dependencyService = module.get(ResourceDependencyService)
  })

  describe('log', () => {
    it('devrait rejeter avec UnauthorizedResponse sans permission de lecture', async () => {
      fileService.repo.mockResolvedValue({
        repo: buildRepo(),
        resource: buildResource(),
        permissions: { read: false },
      } as never)

      await expect(controller.log(buildReq(), 'resource-1')).rejects.toBeInstanceOf(UnauthorizedResponse)
    })

    it('devrait retourner le log du dépôt', async () => {
      const repo = buildRepo({ log: jest.fn().mockResolvedValue(['commit1']) })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { read: true } } as never)

      const result = await controller.log(buildReq(), 'resource-1')

      expect(result).toEqual(['commit1'])
    })
  })

  describe('release', () => {
    it("devrait rejeter avec UnauthorizedResponse sans permission d'écriture", async () => {
      fileService.repo.mockResolvedValue({
        repo: buildRepo(),
        resource: buildResource(),
        permissions: { write: false },
      } as never)

      await expect(
        controller.release(buildReq(), 'resource-1', { name: 'v2', message: 'release' })
      ).rejects.toBeInstanceOf(UnauthorizedResponse)
    })

    it('devrait créer une nouvelle version, émettre un événement, et retourner les versions', async () => {
      const repo = buildRepo({ versions: jest.fn().mockResolvedValue({ all: [{ tag: 'v2' }] }) })
      const resource = buildResource({ template: undefined } as never)
      fileService.repo.mockResolvedValue({ repo, resource, permissions: { write: true } } as never)

      const result = await controller.release(buildReq(), 'resource-1', { name: 'v2', message: 'release' })

      expect(repo.release).toHaveBeenCalledWith('v2', 'release')
      expect(dependencyService.createDependencyForNewVersion).not.toHaveBeenCalled()
      expect(eventService.emit).toHaveBeenCalledWith(expect.any(String), { repo, resource })
      expect(result).toEqual({ all: [{ tag: 'v2' }] })
    })

    it("devrait créer une dépendance de version si la ressource hérite d'un template", async () => {
      const repo = buildRepo()
      const resource = buildResource({ template: {} } as never)
      fileService.repo.mockResolvedValue({ repo, resource, permissions: { write: true } } as never)

      await controller.release(buildReq(), 'resource-1', { name: 'v2', message: 'release' })

      expect(dependencyService.createDependencyForNewVersion).toHaveBeenCalledWith('resource-1', 'v2')
    })
  })

  describe('compileExercise', () => {
    it('devrait retourner le résultat de la compilation', async () => {
      fileService.compile.mockResolvedValue({ source: { errors: [] } } as never)

      const result = await controller.compileExercise(buildReq(), 'resource-1')

      expect(fileService.compile).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'resource-1', withAst: true })
      )
      expect(result).toEqual({ errors: [] })
    })
  })

  describe('transformExercise', () => {
    it('devrait déléguer la transformation au compilateur', async () => {
      const toExercise = jest.fn().mockReturnValue('output')
      fileService.compile.mockResolvedValue({ compiler: { toExercise } } as never)

      const result = await controller.transformExercise(buildReq(), 'resource-1', 'latest', {
        changes: { a: 1 },
        includes: ['x'],
      } as never)

      expect(toExercise).toHaveBeenCalledWith({ variableChanges: { a: 1 }, includeChanges: ['x'] })
      expect(result).toBe('output')
    })
  })

  describe('get', () => {
    it('devrait retourner la liste des fichiers zip quand zipList est demandé', async () => {
      const repo = buildRepo({ listZipFiles: jest.fn().mockResolvedValue(['a.txt']) })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      const result = await controller.get(buildReq({ path: 'archive.zip' }), buildRes(), 'resource-1', {
        zipList: true,
      } as never)

      expect(result).toEqual(['a.txt'])
    })

    it('devrait retourner describe()', async () => {
      const repo = buildRepo({ describe: jest.fn().mockResolvedValue({ ok: true }) })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      const result = await controller.get(buildReq(), buildRes(), 'resource-1', { describe: true } as never)

      expect(result).toEqual({ ok: true })
    })

    it('devrait retourner versions()', async () => {
      const repo = buildRepo({ versions: jest.fn().mockResolvedValue({ all: [] }) })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      const result = await controller.get(buildReq(), buildRes(), 'resource-1', { versions: true } as never)

      expect(result).toEqual({ all: [] })
    })

    it('devrait déléguer la recherche au dépôt', async () => {
      const repo = buildRepo({ search: jest.fn().mockResolvedValue([]) })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await controller.get(buildReq(), buildRes(), 'resource-1', {
        search: 'foo',
        match_case: true,
        match_word: false,
        use_regex: true,
      } as never)

      expect(repo.search).toHaveBeenCalledWith({ query: 'foo', matchCase: true, matchWord: false, useRegex: true })
    })

    it("devrait rejeter l'arbre d'exercices pour un type de ressource non-activité", async () => {
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({
        repo,
        resource: buildResource({ type: ResourceTypes.EXERCISE }),
        permissions: { write: true },
      } as never)

      await expect(
        controller.get(buildReq(), buildRes(), 'resource-1', { exerciseTree: true } as never)
      ).rejects.toBeInstanceOf(BadRequestResponse)
    })

    it("devrait retourner l'arbre d'exercices pour une activité", async () => {
      const main = JSON.stringify({
        exerciseGroups: { group1: { name: 'Group 1', exercises: [{ id: 'e1', version: 'v1', resource: 'r1' }] } },
      })
      const repo = buildRepo({
        read: jest.fn().mockResolvedValue([{}, Promise.resolve(new TextEncoder().encode(main))]),
      })
      fileService.repo.mockResolvedValue({
        repo,
        resource: buildResource({ type: ResourceTypes.ACTIVITY }),
        permissions: { write: true },
      } as never)

      const result = await controller.get(buildReq(), buildRes(), 'resource-1', { exerciseTree: true } as never)

      expect(result).toEqual([
        { id: 'group1', name: 'Group 1', exercises: [{ id: 'e1', version: 'v1', resource: 'r1' }] },
      ])
    })

    it('devrait retourner le contenu texte du fichier lu par défaut', async () => {
      const node = { type: 'file', path: 'main.ple', version: 'latest' }
      const repo = buildRepo({
        read: jest.fn().mockResolvedValue([node, Promise.resolve(new TextEncoder().encode('content'))]),
      })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      const result = await controller.get(buildReq(), buildRes(), 'resource-1', {} as never)

      expect(result).toBe('content')
    })

    it('devrait injecter le code de ressource et readOnly sur un noeud dossier', async () => {
      const node = {
        type: 'folder',
        path: 'src',
        version: 'latest',
        children: [{ type: 'file', path: 'src/a.ple', version: 'latest' }],
      }
      const repo = buildRepo({ read: jest.fn().mockResolvedValue([node, undefined]) })
      fileService.repo.mockResolvedValue({
        repo,
        resource: buildResource({ code: 'my-code' } as never),
        permissions: { write: false },
      } as never)

      const result = await controller.get(buildReq(), buildRes(), 'resource-1', {} as never)

      expect((result as never as { resourceCode: string }).resourceCode).toBe('my-code')
      expect((result as never as { readOnly: boolean }).readOnly).toBe(true)
      expect((result as never as { children: { readOnly: boolean }[] }).children[0].readOnly).toBe(true)
    })
  })

  describe('put', () => {
    it("devrait rejeter avec UnauthorizedResponse sans permission d'écriture", async () => {
      fileService.repo.mockResolvedValue({
        repo: buildRepo(),
        resource: buildResource(),
        permissions: { write: false },
      } as never)

      await expect(
        controller.put(buildReq(), 'resource-1', { content: 'x' }, undefined as never)
      ).rejects.toBeInstanceOf(UnauthorizedResponse)
    })

    it('devrait rejeter si le contenu est manquant et aucun bundle fourni', async () => {
      fileService.repo.mockResolvedValue({
        repo: buildRepo(),
        resource: buildResource(),
        permissions: { write: true },
      } as never)

      await expect(controller.put(buildReq(), 'resource-1', {}, undefined as never)).rejects.toBeInstanceOf(
        BadRequestResponse
      )
    })

    it('devrait écrire le contenu et émettre un événement de modification', async () => {
      const repo = buildRepo({
        read: jest.fn().mockResolvedValue([{}, Promise.resolve(new TextEncoder().encode('old'))]),
      })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await controller.put(buildReq(), 'resource-1', { content: 'new' }, undefined as never)

      expect(repo.write).toHaveBeenCalledWith('', 'new')
      expect(eventService.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operation: 'update', newContent: 'new' })
      )
    })
  })

  describe('post', () => {
    it("devrait rejeter avec UnauthorizedResponse sans permission d'écriture", async () => {
      fileService.repo.mockResolvedValue({
        repo: buildRepo(),
        resource: buildResource(),
        permissions: { write: false },
      } as never)

      await expect(controller.post(buildReq(), 'resource-1', [], undefined as never)).rejects.toBeInstanceOf(
        UnauthorizedResponse
      )
    })

    it('devrait uploader un fichier binaire et émettre un événement de création', async () => {
      const repo = buildRepo({ upload: jest.fn().mockResolvedValue('uploaded-name') })
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)
      const file = { path: '/tmp/upload', originalname: 'photo.png' } as Express.Multer.File

      const result = await controller.post(buildReq(), 'resource-1', [], file)

      expect(repo.upload).toHaveBeenCalled()
      expect((result as { resource: string }).resource).toBe('uploaded-name')
    })

    it('devrait créer les fichiers/dossiers demandés dans une seule transaction', async () => {
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await controller.post(
        buildReq(),
        'resource-1',
        [{ path: 'a.txt', content: 'hello' }, { path: 'folder' }],
        undefined as never
      )

      expect(repo.touch).toHaveBeenCalledWith('a.txt', 'hello')
      expect(repo.mkdir).toHaveBeenCalledWith('folder')
      expect(repo.commit).toHaveBeenCalled()
    })
  })

  describe('patch', () => {
    it("devrait rejeter avec UnauthorizedResponse sans permission d'écriture", async () => {
      fileService.repo.mockResolvedValue({
        repo: buildRepo(),
        resource: buildResource(),
        permissions: { write: false },
      } as never)

      await expect(controller.patch(buildReq(), 'resource-1', {})).rejects.toBeInstanceOf(UnauthorizedResponse)
    })

    it('devrait dézipper avec un fichier spécifique', async () => {
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await controller.patch(buildReq(), 'resource-1', { unzip: true, unzipFile: 'a.txt' } as never)

      expect(repo.unzipFile).toHaveBeenCalledWith('', 'a.txt')
      expect(repo.unzip).not.toHaveBeenCalled()
    })

    it("devrait rejeter si aucune destination n'est fournie hors dézippage", async () => {
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await expect(controller.patch(buildReq(), 'resource-1', {} as never)).rejects.toBeInstanceOf(BadRequestResponse)
    })

    it('devrait renommer et émettre deux événements (delete puis create)', async () => {
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await controller.patch(buildReq(), 'resource-1', { rename: true, destination: 'new-name' } as never)

      expect(repo.rename).toHaveBeenCalledWith('', 'new-name')
      expect(repo.move).not.toHaveBeenCalled()
      expect(eventService.emit).toHaveBeenCalledTimes(2)
    })

    it('devrait déplacer et émettre un seul événement de création', async () => {
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await controller.patch(buildReq(), 'resource-1', { destination: 'new-folder', copy: true } as never)

      expect(repo.move).toHaveBeenCalledWith('', 'new-folder', true)
      expect(eventService.emit).toHaveBeenCalledTimes(1)
    })
  })

  describe('delete', () => {
    it("devrait rejeter avec UnauthorizedResponse sans permission d'écriture", async () => {
      fileService.repo.mockResolvedValue({
        repo: buildRepo(),
        resource: buildResource(),
        permissions: { write: false },
      } as never)

      await expect(controller.delete(buildReq(), 'resource-1')).rejects.toBeInstanceOf(UnauthorizedResponse)
    })

    it("devrait rejeter la suppression d'un cercle non personnel par un non-admin", async () => {
      const resource = buildResource({ type: ResourceTypes.CIRCLE, personal: false })
      fileService.repo.mockResolvedValue({ repo: buildRepo(), resource, permissions: { write: true } } as never)

      await expect(controller.delete(buildReq({}, { role: 'teacher' }), 'resource-1')).rejects.toBeInstanceOf(
        UnauthorizedResponse
      )
    })

    it('devrait supprimer le fichier et émettre un événement', async () => {
      const repo = buildRepo()
      fileService.repo.mockResolvedValue({ repo, resource: buildResource(), permissions: { write: true } } as never)

      await controller.delete(buildReq({ path: 'to-delete.txt' }), 'resource-1')

      expect(repo.remove).toHaveBeenCalledWith('to-delete.txt')
      expect(eventService.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operation: 'delete' })
      )
    })
  })
})
