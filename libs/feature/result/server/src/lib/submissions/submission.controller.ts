import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { IRequest, UUIDParam, getContentDisposition } from '@platon/core/server'
import { Response } from 'express'
import { SubmissionService } from './submission.service'
import { SubmissionReadDTO, SubmissionCreateDTO, SubmissionListDTO } from './submission.dto'
import { UserRoles } from '@platon/core/common'

@ApiBearerAuth()
@ApiTags('submissions')
@Controller('sessions/:sessionId/submissions')
export class SubmissionController {
  private readonly logger = new Logger(SubmissionController.name)

  constructor(private readonly submissionService: SubmissionService) {}

  /**
   * Upload une nouvelle soumission
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        comment: {
          type: 'string',
        },
      },
    },
  })
  async uploadSubmission(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubmissionCreateDTO,
    @Req() request: IRequest
  ): Promise<SubmissionReadDTO> {
    if (!file) {
      throw new BadRequestException('No file provided')
    }

    return this.submissionService.uploadSubmission(file, sessionId, request, dto)
  }

  /**
   * Liste les soumissions d'une session
   */
  @Get()
  async listSubmissions(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Query('userId') userId: string,
    @Req() request: IRequest
  ): Promise<{ submissions: SubmissionReadDTO[]; total: number }> {
    const dto: SubmissionListDTO = {
      sessionId,
      limit: limit ? parseInt(limit) : 10,
      offset: offset ? parseInt(offset) : 0,
      userId: userId,
    }
    return this.submissionService.listSubmissions(dto, request)
  }

  /**
   * Récupère une soumission spécifique
   */
  @Get(':id')
  async getSubmission(@Param('id') id: string, @Req() request: IRequest): Promise<SubmissionReadDTO> {
    return this.submissionService.getSubmission(id, request)
  }

  /**
   * Télécharge un fichier de soumission
   */
  @Get(':id/download')
  async downloadSubmission(
    @Param('id') id: string,
    @Req() request: IRequest,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const { buffer, fileName, mimeType } = await this.submissionService.downloadSubmission(id, request)

    response.set({
      'Content-Type': mimeType,
      'Content-Disposition': getContentDisposition(fileName),
      'Content-Length': buffer.length,
    })

    return new StreamableFile(buffer)
  }

  /**
   * Télécharge toutes les soumissions d'une activité
   */
  @Get(':activityId/:exerciseId/download-all')
  async downloadAllSubmissions(
    @UUIDParam('activityId') activityId: string,
    @UUIDParam('exerciseId') exerciseId: string,
    @Req() request: IRequest,
    @Res() response: Response
  ): Promise<void> {
    const { stream, fileName } = await this.submissionService.downloadAllSubmissions(activityId, exerciseId, request)

    // Configure la réponse pour envoyer un TAR
    response.setHeader('Content-Type', 'application/x-tar')
    response.setHeader('Content-Disposition', getContentDisposition(fileName))

    stream.pipe(response as unknown as NodeJS.WritableStream)
    stream.on('error', (error) => {
      this.logger.error(`Stream error: ${error}`)
      if (!response.headersSent) {
        response.status(500).send('Failed to generate TAR')
      }
    })
  }

  /**
   * Marque une soumission comme soumise
   */
  @Post(':id/submit')
  async submitSubmission(@Param('id') id: string, @Req() request: IRequest): Promise<SubmissionReadDTO> {
    return this.submissionService.submitSubmission(id, request)
  }

  /**
   * Supprime une soumission
   */
  @Delete(':id')
  async deleteSubmission(@Param('id') id: string, @Req() request: IRequest): Promise<void> {
    return this.submissionService.deleteSubmission(id, request)
  }

  /**
   * Récupère la dernière soumission d'un utilisateur
   */
  @Get('latest/for-user')
  async getLatestSubmission(
    @Param('sessionId') sessionId: string,
    @Query('userId') userId: string,
    @Req() request: IRequest
  ): Promise<SubmissionReadDTO | null> {
    if (request.user.id !== userId && request.user.role !== UserRoles.admin) {
      throw new BadRequestException('You can only view your own submissions')
    }

    return this.submissionService.getLatestSubmission(sessionId, userId)
  }
}
