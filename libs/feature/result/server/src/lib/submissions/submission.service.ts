import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { StudentSubmissionEntity } from './submission.entity'
import { SubmissionStorageService } from './storage.service'
import { SessionService } from '../sessions/session.service'
import { IRequest } from '@platon/core/server'
import { SubmissionReadDTO, SubmissionCreateDTO, SubmissionListDTO } from './submission.dto'
import { isTeacherRole, UserRoles } from '@platon/core/common'
import { CorrectionService } from '../correction/correction.service'
import { PassThrough } from 'stream'

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name)

  constructor(
    @InjectRepository(StudentSubmissionEntity)
    private readonly submissionRepository: Repository<StudentSubmissionEntity>,
    private readonly storageService: SubmissionStorageService,
    private readonly correctionService: CorrectionService,
    private readonly sessionService: SessionService
  ) {}

  /**
   * Upload un nouveau fichier de soumission
   */
  async uploadSubmission(
    file: Express.Multer.File,
    sessionId: string,
    request: IRequest,
    dto: SubmissionCreateDTO
  ): Promise<SubmissionReadDTO> {
    try {
      const userId = request.user.id
      const session = await this.sessionService.findExerciseSessionById(sessionId)

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`)
      }

      // Vérifier que l'utilisateur peut soumettre
      if (session.userId && session.userId !== userId) {
        throw new ForbiddenException('You can only submit to your own session')
      }
      this.validateFile(file)

      const lastSubmission = await this.submissionRepository.findOne({
        where: { sessionId, userId },
        order: { version: 'DESC' },
      })

      const nextVersion = (lastSubmission?.version ?? 0) + 1
      const decodedFileName = this.decodeFileName(file.originalname)

      const { filePath, checksum, fileSize } = await this.storageService.saveFile(
        file.buffer,
        sessionId,
        userId,
        decodedFileName,
        nextVersion
      )

      const submission = this.submissionRepository.create({
        sessionId,
        userId,
        fileName: decodedFileName,
        fileSize,
        mimeType: file.mimetype,
        filePath,
        version: nextVersion,
        checksum,
        uploadedAt: new Date(),
        status: 'completed',
        comment: dto.comment,
      })

      const saved = await this.submissionRepository.save(submission)
      return this.entityToDTO(saved)
    } catch (error) {
      this.logger.error(`Failed to upload submission: ${error}`)
      throw error
    }
  }

  /**
   * Récupère les soumissions d'une session
   */
  async listSubmissions(
    dto: SubmissionListDTO,
    request: IRequest
  ): Promise<{ submissions: SubmissionReadDTO[]; total: number }> {
    try {
      const { sessionId, userId, limit = 10, offset = 0 } = dto

      const session = await this.sessionService.findExerciseSessionById(sessionId)
      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`)
      }

      let query = this.submissionRepository.createQueryBuilder('s').where('s.sessionId = :sessionId', { sessionId })
      const isTeacher = isTeacherRole(request.user.role)
      if (!isTeacher && request.user.id !== session.userId) {
        query = query.andWhere('s.userId = :userId', { userId: request.user.id })
      } else if (userId) {
        query = query.andWhere('s.userId = :userId', { userId })
      }

      const [submissions, total] = await query
        .orderBy('s.version', 'DESC')
        .addOrderBy('s.uploadedAt', 'DESC')
        .skip(offset)
        .take(limit)
        .getManyAndCount()

      return {
        submissions: submissions.map((s) => this.entityToDTO(s)),
        total,
      }
    } catch (error) {
      this.logger.error(`Failed to list submissions: ${error}`)
      throw error
    }
  }

  /**
   * Récupère une soumission spécifique
   */
  async getSubmission(submissionId: string, request: IRequest): Promise<SubmissionReadDTO> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['session'],
      })

      if (!submission) {
        throw new NotFoundException(`Submission ${submissionId} not found`)
      }

      if (submission.userId !== request.user.id && !isTeacherRole(request.user.role)) {
        throw new ForbiddenException('You can only view your own submissions')
      }

      return this.entityToDTO(submission)
    } catch (error) {
      this.logger.error(`Failed to get submission: ${error}`)
      throw error
    }
  }

  /**
   * Télécharge un fichier de soumission
   */
  async downloadSubmission(
    submissionId: string,
    request: IRequest
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
      })

      if (!submission) {
        throw new NotFoundException(`Submission ${submissionId} not found`)
      }

      if (submission.userId !== request.user.id && !isTeacherRole(request.user.role)) {
        throw new ForbiddenException('You can only download your own submissions')
      }

      // Récupérer le fichier
      const buffer = await this.storageService.getFile(
        submission.sessionId,
        submission.userId,
        submission.version,
        submission.fileName
      )

      return {
        buffer,
        fileName: submission.fileName,
        mimeType: submission.mimeType,
      }
    } catch (error) {
      this.logger.error(`Failed to download submission: ${error}`)
      throw error
    }
  }

  async downloadAllSubmissions(
    activityId: string,
    exerciseId: string,
    request: IRequest
  ): Promise<{ stream: PassThrough; fileName: string }> {
    try {
      if (![UserRoles.admin, UserRoles.teacher].includes(request.user.role)) {
        throw new ForbiddenException('Only teachers can download all submissions')
      }
      const activityExercises = await this.correctionService.list(request.user.id, activityId)
      const exercises = activityExercises.length
        ? activityExercises[0].exercises.filter((ex) => ex.exerciseId === exerciseId)
        : []
      if (!exercises.length) {
        throw new NotFoundException(`Exercise ${exerciseId} not found in activity ${activityId}`)
      }
      const submissions = await this.submissionRepository.find({
        where: { sessionId: In(exercises.map((ex) => ex.exerciseSessionId)) },
        relations: ['user', 'session'],
      })
      if (!submissions.length) {
        throw new NotFoundException(`No submissions found for exercise ${exerciseId} in activity ${activityId}`)
      }

      const { stream, title } = await this.storageService.getAllSubmissionsZip(submissions)

      return {
        stream,
        fileName: `${title}-submissions.tar`,
      }
    } catch (error) {
      this.logger.error(`Failed to download all submissions: ${error}`)
      throw error
    }
  }

  /**
   * Supprime une soumission
   */
  async deleteSubmission(submissionId: string, request: IRequest): Promise<void> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
      })

      if (!submission) {
        throw new NotFoundException(`Submission ${submissionId} not found`)
      }

      if (submission.userId !== request.user.id && request.user.role !== UserRoles.admin) {
        throw new ForbiddenException('You can only delete your own submissions')
      }

      // Supprimer du stockage
      await this.storageService.deleteVersion(
        submission.sessionId,
        submission.userId,
        submission.version,
        submission.fileName
      )

      // Supprimer de la base de données
      await this.submissionRepository.remove(submission)

      this.logger.log(`Submission ${submissionId} deleted`)
    } catch (error) {
      this.logger.error(`Failed to delete submission: ${error}`)
      throw error
    }
  }

  /**
   * Récupère la dernière soumission d'un utilisateur pour une session
   */
  async getLatestSubmission(sessionId: string, userId: string): Promise<SubmissionReadDTO | null> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { sessionId, userId },
        order: { version: 'DESC' },
      })

      return submission ? this.entityToDTO(submission) : null
    } catch (error) {
      this.logger.error(`Failed to get latest submission: ${error}`)
      throw error
    }
  }

  /**
   * Marque une soumission comme soumise (pas seulement uploadée)
   */
  async submitSubmission(submissionId: string, request: IRequest): Promise<SubmissionReadDTO> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id: submissionId },
      })

      if (!submission) {
        throw new NotFoundException(`Submission ${submissionId} not found`)
      }

      if (submission.userId !== request.user.id && request.user.role !== UserRoles.admin) {
        throw new ForbiddenException('You can only submit your own submissions')
      }

      submission.submittedAt = new Date()
      submission.status = 'completed'

      const updated = await this.submissionRepository.save(submission)
      return this.entityToDTO(updated)
    } catch (error) {
      this.logger.error(`Failed to submit submission: ${error}`)
      throw error
    }
  }

  /**
   * Valide un fichier
   */
  private validateFile(file: Express.Multer.File): void {
    // Validation de la taille (10 MB par défaut)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024} MB`)
    }

    if (!file.originalname) {
      throw new BadRequestException('File must have a name')
    }
  }

  private decodeFileName(fileName: string): string {
    try {
      const buffer = Buffer.from(fileName, 'latin1')
      const decoded = buffer.toString('utf-8')
      if (decoded !== fileName && !decoded.includes('?')) {
        return decoded
      }

      return fileName
    } catch {
      return fileName
    }
  }

  /**
   * Convertit une entité en DTO
   */
  private entityToDTO(entity: StudentSubmissionEntity): SubmissionReadDTO {
    return {
      id: entity.id,
      sessionId: entity.sessionId,
      userId: entity.userId,
      fileName: entity.fileName,
      fileSize: entity.fileSize,
      mimeType: entity.mimeType,
      version: entity.version,
      status: entity.status,
      uploadedAt: entity.uploadedAt,
      submittedAt: entity.submittedAt,
      comment: entity.comment,
    } as SubmissionReadDTO
  }
}
