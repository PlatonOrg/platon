import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { UserRoles } from '@platon/core/common'
import { IRequest } from '@platon/core/server'
import { SubmissionReadDTO } from './submission.dto'
import { PassThrough } from 'stream'
import { SubmissionController } from './submission.controller'
import { SubmissionService } from './submission.service'

describe('SubmissionController', () => {
  let controller: SubmissionController
  let service: jest.Mocked<
    Pick<
      SubmissionService,
      | 'uploadSubmission'
      | 'listSubmissions'
      | 'getSubmission'
      | 'downloadSubmission'
      | 'downloadAllSubmissions'
      | 'submitSubmission'
      | 'deleteSubmission'
      | 'getLatestSubmission'
    >
  >

  beforeEach(async () => {
    service = {
      uploadSubmission: jest.fn(),
      listSubmissions: jest.fn(),
      getSubmission: jest.fn(),
      downloadSubmission: jest.fn(),
      downloadAllSubmissions: jest.fn(),
      submitSubmission: jest.fn(),
      deleteSubmission: jest.fn(),
      getLatestSubmission: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [SubmissionController, { provide: SubmissionService, useValue: service }],
    }).compile()

    controller = module.get(SubmissionController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadSubmission', () => {
    it('devrait lever une BadRequestException sans fichier', async () => {
      const req = { user: { id: 'user-1' } } as IRequest

      await expect(controller.uploadSubmission('session-1', undefined as never, {}, req)).rejects.toBeInstanceOf(
        BadRequestException
      )
    })

    it('devrait déléguer au service avec le fichier fourni', async () => {
      const file = {} as Express.Multer.File
      service.uploadSubmission.mockResolvedValue({ id: 'sub-1' } as SubmissionReadDTO)
      const req = { user: { id: 'user-1' } } as IRequest

      const result = await controller.uploadSubmission('session-1', file, {}, req)

      expect(service.uploadSubmission).toHaveBeenCalledWith(file, 'session-1', req, {})
      expect(result.id).toBe('sub-1')
    })
  })

  it('listSubmissions devrait convertir limit/offset en nombres', async () => {
    service.listSubmissions.mockResolvedValue({ submissions: [], total: 0 })
    const req = { user: { id: 'user-1' } } as IRequest

    await controller.listSubmissions('session-1', '5', '2', 'user-2', req)

    expect(service.listSubmissions).toHaveBeenCalledWith(
      { sessionId: 'session-1', limit: 5, offset: 2, userId: 'user-2' },
      req
    )
  })

  it('listSubmissions devrait utiliser les valeurs par défaut sans query params', async () => {
    service.listSubmissions.mockResolvedValue({ submissions: [], total: 0 })
    const req = { user: { id: 'user-1' } } as IRequest

    await controller.listSubmissions('session-1', undefined as never, undefined as never, undefined as never, req)

    expect(service.listSubmissions).toHaveBeenCalledWith(
      { sessionId: 'session-1', limit: 10, offset: 0, userId: undefined },
      req
    )
  })

  it('getSubmission devrait déléguer au service', async () => {
    service.getSubmission.mockResolvedValue({ id: 'sub-1' } as SubmissionReadDTO)
    const req = { user: { id: 'user-1' } } as IRequest

    await controller.getSubmission('sub-1', req)

    expect(service.getSubmission).toHaveBeenCalledWith('sub-1', req)
  })

  describe('downloadSubmission', () => {
    it('devrait configurer les en-têtes de réponse et retourner un StreamableFile', async () => {
      service.downloadSubmission.mockResolvedValue({
        buffer: Buffer.from('content'),
        fileName: 'file.txt',
        mimeType: 'text/plain',
      })
      const response = { set: jest.fn() } as never
      const req = { user: { id: 'user-1' } } as IRequest

      const result = await controller.downloadSubmission('sub-1', req, response)

      expect((response as { set: jest.Mock }).set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'text/plain' })
      )
      expect(result).toBeDefined()
    })
  })

  describe('downloadAllSubmissions', () => {
    it('devrait piper le stream vers la réponse avec les bons en-têtes', async () => {
      const stream = new PassThrough()
      service.downloadAllSubmissions.mockResolvedValue({ stream, fileName: 'archive.tar' })
      const response = {
        setHeader: jest.fn(),
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
      }
      const req = { user: { id: 'teacher-1', role: UserRoles.teacher } } as IRequest

      await controller.downloadAllSubmissions('activity-1', 'ex-1', req, response as never)

      expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-tar')
    })
  })

  it('submitSubmission devrait déléguer au service', async () => {
    service.submitSubmission.mockResolvedValue({ id: 'sub-1' } as SubmissionReadDTO)
    const req = { user: { id: 'user-1' } } as IRequest

    await controller.submitSubmission('sub-1', req)

    expect(service.submitSubmission).toHaveBeenCalledWith('sub-1', req)
  })

  it('deleteSubmission devrait déléguer au service', async () => {
    const req = { user: { id: 'user-1' } } as IRequest

    await controller.deleteSubmission('sub-1', req)

    expect(service.deleteSubmission).toHaveBeenCalledWith('sub-1', req)
  })

  describe('getLatestSubmission', () => {
    it('devrait lever une BadRequestException pour un autre utilisateur non admin', async () => {
      const req = { user: { id: 'user-1', role: UserRoles.student } } as IRequest

      await expect(controller.getLatestSubmission('session-1', 'user-2', req)).rejects.toBeInstanceOf(
        BadRequestException
      )
    })

    it("devrait autoriser un admin à consulter la soumission d'un autre utilisateur", async () => {
      service.getLatestSubmission.mockResolvedValue(null)
      const req = { user: { id: 'admin-1', role: UserRoles.admin } } as IRequest

      const result = await controller.getLatestSubmission('session-1', 'user-2', req)

      expect(result).toBeNull()
    })

    it('devrait autoriser le propriétaire à consulter sa propre soumission', async () => {
      service.getLatestSubmission.mockResolvedValue({ id: 'sub-1' } as SubmissionReadDTO)
      const req = { user: { id: 'user-1', role: UserRoles.student } } as IRequest

      const result = await controller.getLatestSubmission('session-1', 'user-1', req)

      expect(result?.id).toBe('sub-1')
    })
  })
})
