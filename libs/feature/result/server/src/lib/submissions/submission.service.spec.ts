import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserRoles } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { MockRepository, mockRepository, mockSelectQueryBuilder } from '@platon/core/testing/server'
import { ActivityCorrection } from '@platon/feature/result/common'
import { PassThrough } from 'stream'
import { SelectQueryBuilder } from 'typeorm'
import { CorrectionService } from '../correction/correction.service'
import { SessionService } from '../sessions/session.service'
import { SessionEntity } from '../sessions/session.entity'
import { SubmissionStorageService } from './storage.service'
import { StudentSubmissionEntity } from './submission.entity'
import { SubmissionService } from './submission.service'

describe('SubmissionService', () => {
  let service: SubmissionService
  let repository: MockRepository<StudentSubmissionEntity>
  let storageService: jest.Mocked<
    Pick<SubmissionStorageService, 'saveFile' | 'getFile' | 'deleteVersion' | 'getAllSubmissionsZip'>
  >
  let correctionService: jest.Mocked<Pick<CorrectionService, 'list'>>
  let sessionService: jest.Mocked<Pick<SessionService, 'findExerciseSessionById'>>

  beforeEach(async () => {
    repository = mockRepository<StudentSubmissionEntity>()
    storageService = {
      saveFile: jest.fn(),
      getFile: jest.fn(),
      deleteVersion: jest.fn(),
      getAllSubmissionsZip: jest.fn(),
    }
    correctionService = { list: jest.fn() }
    sessionService = { findExerciseSessionById: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        SubmissionService,
        { provide: getRepositoryToken(StudentSubmissionEntity), useValue: repository },
        { provide: SubmissionStorageService, useValue: storageService },
        { provide: CorrectionService, useValue: correctionService },
        { provide: SessionService, useValue: sessionService },
      ],
    }).compile()

    service = module.get(SubmissionService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadSubmission', () => {
    const file = {
      size: 100,
      originalname: 'file.txt',
      buffer: Buffer.from('x'),
      mimetype: 'text/plain',
    } as Express.Multer.File
    const request = { user: { id: 'user-1' } } as IRequest

    it("devrait lever une NotFoundException si la session n'existe pas", async () => {
      sessionService.findExerciseSessionById.mockResolvedValue(null)

      await expect(service.uploadSubmission(file, 'session-1', request, {})).rejects.toBeInstanceOf(NotFoundException)
    })

    it("devrait lever une ForbiddenException si l'utilisateur n'est pas propriétaire de la session", async () => {
      sessionService.findExerciseSessionById.mockResolvedValue({ userId: 'user-2' } as SessionEntity)

      await expect(service.uploadSubmission(file, 'session-1', request, {})).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('devrait lever une BadRequestException si le fichier dépasse la taille max', async () => {
      sessionService.findExerciseSessionById.mockResolvedValue({ userId: 'user-1' } as SessionEntity)

      await expect(
        service.uploadSubmission({ ...file, size: 11 * 1024 * 1024 }, 'session-1', request, {})
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('devrait incrémenter la version depuis la dernière soumission', async () => {
      sessionService.findExerciseSessionById.mockResolvedValue({ userId: 'user-1' } as SessionEntity)
      repository.findOne.mockResolvedValue({ version: 3 } as StudentSubmissionEntity)
      storageService.saveFile.mockResolvedValue({ filePath: '/tmp/f', checksum: 'abc', fileSize: 1 })
      repository.create.mockImplementation((e) => e as StudentSubmissionEntity)
      repository.save.mockImplementation(async (e) => e as StudentSubmissionEntity)

      await service.uploadSubmission(file, 'session-1', request, {})

      expect(storageService.saveFile).toHaveBeenCalledWith(file.buffer, 'session-1', 'user-1', 'file.txt', 4)
    })

    it('devrait démarrer à la version 1 sans soumission précédente', async () => {
      sessionService.findExerciseSessionById.mockResolvedValue({ userId: 'user-1' } as SessionEntity)
      repository.findOne.mockResolvedValue(null)
      storageService.saveFile.mockResolvedValue({ filePath: '/tmp/f', checksum: 'abc', fileSize: 1 })
      repository.create.mockImplementation((e) => e as StudentSubmissionEntity)
      repository.save.mockImplementation(async (e) => e as StudentSubmissionEntity)

      await service.uploadSubmission(file, 'session-1', request, {})

      expect(storageService.saveFile).toHaveBeenCalledWith(file.buffer, 'session-1', 'user-1', 'file.txt', 1)
    })
  })

  describe('listSubmissions', () => {
    it("devrait lever une NotFoundException si la session n'existe pas", async () => {
      sessionService.findExerciseSessionById.mockResolvedValue(null)

      await expect(
        service.listSubmissions({ sessionId: 'session-1' }, { user: { id: 'user-1' } } as IRequest)
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('devrait restreindre à ses propres soumissions pour un étudiant non propriétaire', async () => {
      sessionService.findExerciseSessionById.mockResolvedValue({ userId: 'user-2' } as SessionEntity)
      const qb = mockSelectQueryBuilder<StudentSubmissionEntity>()
      repository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<StudentSubmissionEntity>)

      await service.listSubmissions({ sessionId: 'session-1' }, {
        user: { id: 'user-1', role: UserRoles.student },
      } as IRequest)

      expect(qb.andWhere).toHaveBeenCalledWith('s.userId = :userId', { userId: 'user-1' })
    })

    it('devrait filtrer par userId fourni pour un enseignant', async () => {
      sessionService.findExerciseSessionById.mockResolvedValue({ userId: 'user-2' } as SessionEntity)
      const qb = mockSelectQueryBuilder<StudentSubmissionEntity>()
      repository.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<StudentSubmissionEntity>)

      await service.listSubmissions({ sessionId: 'session-1', userId: 'user-3' }, {
        user: { id: 'teacher-1', role: UserRoles.teacher },
      } as IRequest)

      expect(qb.andWhere).toHaveBeenCalledWith('s.userId = :userId', { userId: 'user-3' })
    })
  })

  describe('getSubmission', () => {
    it("devrait lever une NotFoundException si la soumission n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.getSubmission('sub-1', { user: { id: 'user-1' } } as IRequest)).rejects.toBeInstanceOf(
        NotFoundException
      )
    })

    it('devrait lever une ForbiddenException pour un autre étudiant', async () => {
      repository.findOne.mockResolvedValue({ userId: 'user-2' } as StudentSubmissionEntity)

      await expect(
        service.getSubmission('sub-1', { user: { id: 'user-1', role: UserRoles.student } } as IRequest)
      ).rejects.toBeInstanceOf(ForbiddenException)
    })

    it("devrait autoriser un enseignant à consulter la soumission de quelqu'un d'autre", async () => {
      repository.findOne.mockResolvedValue({ userId: 'user-2', id: 'sub-1' } as StudentSubmissionEntity)

      const result = await service.getSubmission('sub-1', {
        user: { id: 'teacher-1', role: UserRoles.teacher },
      } as IRequest)

      expect(result.id).toBe('sub-1')
    })
  })

  describe('downloadSubmission', () => {
    it("devrait lever une NotFoundException si la soumission n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.downloadSubmission('sub-1', { user: { id: 'user-1' } } as IRequest)).rejects.toBeInstanceOf(
        NotFoundException
      )
    })

    it('devrait retourner le buffer, le nom et le type mime du fichier', async () => {
      repository.findOne.mockResolvedValue({
        userId: 'user-1',
        sessionId: 'session-1',
        version: 1,
        fileName: 'file.txt',
        mimeType: 'text/plain',
      } as StudentSubmissionEntity)
      storageService.getFile.mockResolvedValue(Buffer.from('content'))

      const result = await service.downloadSubmission('sub-1', { user: { id: 'user-1' } } as IRequest)

      expect(result.buffer.toString()).toBe('content')
      expect(result.fileName).toBe('file.txt')
    })
  })

  describe('downloadAllSubmissions', () => {
    it('devrait lever une ForbiddenException pour un étudiant', async () => {
      await expect(
        service.downloadAllSubmissions('activity-1', 'ex-1', {
          user: { id: 'user-1', role: UserRoles.student },
        } as IRequest)
      ).rejects.toBeInstanceOf(ForbiddenException)
    })

    it("devrait lever une NotFoundException si l'exercice n'est pas trouvé dans la correction", async () => {
      correctionService.list.mockResolvedValue([])

      await expect(
        service.downloadAllSubmissions('activity-1', 'ex-1', {
          user: { id: 'teacher-1', role: UserRoles.teacher },
        } as IRequest)
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it("devrait lever une NotFoundException si aucune soumission n'est trouvée", async () => {
      correctionService.list.mockResolvedValue([
        { exercises: [{ exerciseId: 'ex-1', exerciseSessionId: 'es-1' }] },
      ] as unknown as ActivityCorrection[])
      repository.find.mockResolvedValue([])

      await expect(
        service.downloadAllSubmissions('activity-1', 'ex-1', {
          user: { id: 'teacher-1', role: UserRoles.teacher },
        } as IRequest)
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('devrait retourner le stream tar et le nom de fichier', async () => {
      correctionService.list.mockResolvedValue([
        { exercises: [{ exerciseId: 'ex-1', exerciseSessionId: 'es-1' }] },
      ] as unknown as ActivityCorrection[])
      repository.find.mockResolvedValue([{ id: 'sub-1' } as StudentSubmissionEntity])
      const stream = new PassThrough()
      storageService.getAllSubmissionsZip.mockResolvedValue({ stream, title: 'Exercise' })

      const result = await service.downloadAllSubmissions('activity-1', 'ex-1', {
        user: { id: 'teacher-1', role: UserRoles.teacher },
      } as IRequest)

      expect(result.fileName).toBe('Exercise-submissions.tar')
    })
  })

  describe('deleteSubmission', () => {
    it("devrait lever une NotFoundException si la soumission n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.deleteSubmission('sub-1', { user: { id: 'user-1' } } as IRequest)).rejects.toBeInstanceOf(
        NotFoundException
      )
    })

    it('devrait lever une ForbiddenException pour un non-propriétaire non admin', async () => {
      repository.findOne.mockResolvedValue({ userId: 'user-2' } as StudentSubmissionEntity)

      await expect(
        service.deleteSubmission('sub-1', { user: { id: 'user-1', role: UserRoles.student } } as IRequest)
      ).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('devrait supprimer du stockage puis de la base', async () => {
      const submission = {
        userId: 'user-1',
        sessionId: 'session-1',
        version: 1,
        fileName: 'file.txt',
      } as StudentSubmissionEntity
      repository.findOne.mockResolvedValue(submission)

      await service.deleteSubmission('sub-1', { user: { id: 'user-1', role: UserRoles.student } } as IRequest)

      expect(storageService.deleteVersion).toHaveBeenCalledWith('session-1', 'user-1', 1, 'file.txt')
      expect(repository.remove).toHaveBeenCalledWith(submission)
    })
  })

  describe('getLatestSubmission', () => {
    it('devrait retourner null sans soumission', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.getLatestSubmission('session-1', 'user-1')

      expect(result).toBeNull()
    })
  })

  describe('submitSubmission', () => {
    it("devrait lever une NotFoundException si la soumission n'existe pas", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.submitSubmission('sub-1', { user: { id: 'user-1' } } as IRequest)).rejects.toBeInstanceOf(
        NotFoundException
      )
    })

    it('devrait marquer la soumission comme complétée avec submittedAt', async () => {
      const submission = { userId: 'user-1', status: 'pending' } as StudentSubmissionEntity
      repository.findOne.mockResolvedValue(submission)
      repository.save.mockImplementation(async (e) => e as StudentSubmissionEntity)

      const result = await service.submitSubmission('sub-1', {
        user: { id: 'user-1', role: UserRoles.student },
      } as IRequest)

      expect(result.status).toBe('completed')
      expect(result.submittedAt).toBeInstanceOf(Date)
    })
  })
})
