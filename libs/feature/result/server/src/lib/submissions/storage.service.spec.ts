import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { StudentSubmissionEntity } from './submission.entity'
import { SubmissionStorageService } from './storage.service'

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
  remove: jest.fn(),
  readdir: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}))

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(),
}))

const fsExtraMock = require('fs-extra') as {
  ensureDirSync: jest.Mock
  ensureDir: jest.Mock
  writeFile: jest.Mock
  existsSync: jest.Mock
  readFile: jest.Mock
  remove: jest.Mock
  readdir: jest.Mock
  readdirSync: jest.Mock
  statSync: jest.Mock
}

const createReadStreamMock = require('fs').createReadStream as jest.Mock

describe('SubmissionStorageService', () => {
  let service: SubmissionStorageService
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue('/tmp/submissions') }
    fsExtraMock.ensureDirSync.mockReturnValue(undefined)

    const module = await Test.createTestingModule({
      providers: [SubmissionStorageService, { provide: ConfigService, useValue: configService }],
    }).compile()

    service = module.get(SubmissionStorageService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('devrait initialiser le répertoire de soumissions à la construction', () => {
    expect(fsExtraMock.ensureDirSync).toHaveBeenCalled()
  })

  it("devrait relancer l'erreur si l'initialisation du répertoire échoue", async () => {
    fsExtraMock.ensureDirSync.mockImplementationOnce(() => {
      throw new Error('disk full')
    })

    await expect(
      Test.createTestingModule({
        providers: [SubmissionStorageService, { provide: ConfigService, useValue: configService }],
      }).compile()
    ).rejects.toThrow('disk full')
  })

  describe('sanitizeFileName', () => {
    it('devrait remplacer les caractères non autorisés par des underscores', () => {
      const sanitized = (service as unknown as { sanitizeFileName: (s: string) => string }).sanitizeFileName(
        '../../etc/passwd'
      )

      expect(sanitized).not.toContain('/')
    })
  })

  describe('protection contre le path traversal', () => {
    it('devrait rejeter un sessionId qui échapperait au répertoire de soumissions', async () => {
      await expect(service.getFile('..', 'user-1', 1, 'file.txt')).rejects.toThrow()
    })
  })

  describe('saveFile', () => {
    it('devrait créer le répertoire, écrire le fichier et retourner le checksum', async () => {
      fsExtraMock.ensureDir.mockResolvedValue(undefined)
      fsExtraMock.writeFile.mockResolvedValue(undefined)

      const result = await service.saveFile(Buffer.from('content'), 'session-1', 'user-1', 'file.txt', 1)

      expect(fsExtraMock.ensureDir).toHaveBeenCalled()
      expect(fsExtraMock.writeFile).toHaveBeenCalled()
      expect(result.checksum).toHaveLength(64)
      expect(result.fileSize).toBe(7)
    })

    it("devrait relancer l'erreur si l'écriture échoue", async () => {
      fsExtraMock.ensureDir.mockResolvedValue(undefined)
      fsExtraMock.writeFile.mockRejectedValue(new Error('disk full'))

      await expect(service.saveFile(Buffer.from('x'), 'session-1', 'user-1', 'file.txt', 1)).rejects.toThrow(
        'disk full'
      )
    })
  })

  describe('getFile', () => {
    it("devrait lever une erreur si le fichier n'existe pas", async () => {
      fsExtraMock.existsSync.mockReturnValue(false)

      await expect(service.getFile('session-1', 'user-1', 1, 'file.txt')).rejects.toThrow('File not found')
    })

    it('devrait retourner le buffer du fichier existant', async () => {
      fsExtraMock.existsSync.mockReturnValue(true)
      fsExtraMock.readFile.mockResolvedValue(Buffer.from('content'))

      const result = await service.getFile('session-1', 'user-1', 1, 'file.txt')

      expect(result.toString()).toBe('content')
    })
  })

  describe('getFileStream', () => {
    it("devrait lever une erreur si le fichier n'existe pas", () => {
      fsExtraMock.existsSync.mockReturnValue(false)

      expect(() => service.getFileStream('session-1', 'user-1', 1, 'file.txt')).toThrow('File not found')
    })

    it('devrait retourner un stream de lecture pour un fichier existant', () => {
      fsExtraMock.existsSync.mockReturnValue(true)
      const fakeStream = {} as NodeJS.ReadableStream
      createReadStreamMock.mockReturnValue(fakeStream)

      const result = service.getFileStream('session-1', 'user-1', 1, 'file.txt')

      expect(result).toBe(fakeStream)
    })
  })

  describe('deleteAllVersions', () => {
    it("ne devrait rien faire si le répertoire n'existe pas", async () => {
      fsExtraMock.existsSync.mockReturnValue(false)

      await service.deleteAllVersions('session-1', 'user-1')

      expect(fsExtraMock.remove).not.toHaveBeenCalled()
    })

    it('devrait supprimer le répertoire existant', async () => {
      fsExtraMock.existsSync.mockReturnValue(true)
      fsExtraMock.remove.mockResolvedValue(undefined)

      await service.deleteAllVersions('session-1', 'user-1')

      expect(fsExtraMock.remove).toHaveBeenCalled()
    })
  })

  describe('deleteVersion', () => {
    it("ne devrait rien faire si le fichier n'existe pas", async () => {
      fsExtraMock.existsSync.mockReturnValue(false)

      await service.deleteVersion('session-1', 'user-1', 1, 'file.txt')

      expect(fsExtraMock.remove).not.toHaveBeenCalled()
    })

    it('devrait supprimer le fichier existant', async () => {
      fsExtraMock.existsSync.mockReturnValue(true)
      fsExtraMock.remove.mockResolvedValue(undefined)

      await service.deleteVersion('session-1', 'user-1', 1, 'file.txt')

      expect(fsExtraMock.remove).toHaveBeenCalled()
    })
  })

  describe('listVersions', () => {
    it("devrait retourner un tableau vide si le répertoire n'existe pas", async () => {
      fsExtraMock.existsSync.mockReturnValue(false)

      const result = await service.listVersions('session-1', 'user-1')

      expect(result).toEqual([])
    })

    it('devrait retourner les fichiers triés du plus récent au plus ancien', async () => {
      fsExtraMock.existsSync.mockReturnValue(true)
      fsExtraMock.readdir.mockResolvedValue(['v1_a.txt', 'v3_c.txt', 'v2_b.txt'])

      const result = await service.listVersions('session-1', 'user-1')

      expect(result).toEqual(['v3_c.txt', 'v2_b.txt', 'v1_a.txt'])
    })
  })

  describe('getStorageStats', () => {
    it("devrait retourner des stats vides si le répertoire n'existe pas", async () => {
      fsExtraMock.existsSync.mockReturnValue(false)

      const result = await service.getStorageStats()

      expect(result).toEqual({ totalSize: 0, fileCount: 0 })
    })

    it('devrait additionner récursivement la taille des fichiers', async () => {
      fsExtraMock.existsSync.mockReturnValue(true)
      fsExtraMock.readdirSync.mockImplementation((dir: string) =>
        dir.endsWith('sub') ? ['file2.txt'] : ['file1.txt', 'sub']
      )
      fsExtraMock.statSync.mockImplementation((path: string) => ({
        isFile: () => !path.endsWith('sub'),
        isDirectory: () => path.endsWith('sub'),
        size: 100,
      }))

      const result = await service.getStorageStats('session-1', 'user-1')

      expect(result.fileCount).toBe(2)
      expect(result.totalSize).toBe(200)
    })
  })

  describe('getAllSubmissionsZip', () => {
    it('devrait lever une erreur sans soumission', async () => {
      await expect(service.getAllSubmissionsZip([])).rejects.toThrow('No submissions to archive')
    })

    it('devrait retourner un stream et le titre extrait de la première soumission', async () => {
      fsExtraMock.existsSync.mockReturnValue(true)
      createReadStreamMock.mockReturnValue({ pipe: jest.fn() })

      const result = await service.getAllSubmissionsZip([
        { session: { variables: { title: 'Exercise 1' } } } as unknown as StudentSubmissionEntity,
      ])

      expect(result.title).toBe('Exercise_1')
      expect(result.stream).toBeDefined()
    })
  })
})
