import { Controller, Get, Param, Post, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { UserRoles } from '@platon/core/common'
import { IRequest, Public, Roles, UUIDParam } from '@platon/core/server'
import { Response } from 'express'
import * as fs from 'fs'
import mime from 'mime-types'
import { CoursePermissionsService } from '../permissions/permissions.service'
import { CourseFileService } from './course-file.service'

const MAX_COURSE_FILE_SIZE_BYTES = Number.parseInt(process.env['MAX_COURSE_FILE_SIZE_MB'] || '200') * 1024 * 1024

// Stockage minimal de fichiers attachés à un cours (images des leçons pour l'instant), distinct
// du système de Resources versionnées par Git (voir libs/feature/resource/server) : un Course n'est
// pas une Resource, pas besoin de tout l'appareil de versioning pour une simple pièce jointe.
@ApiBearerAuth()
@Controller('courses/:courseId/files')
@ApiTags('Courses')
export class CourseFileController {
  constructor(
    private readonly courseFileService: CourseFileService,
    private readonly permissionsService: CoursePermissionsService
  ) {}

  @Roles(UserRoles.teacher, UserRoles.admin)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { dest: './resources/uploads', limits: { fileSize: MAX_COURSE_FILE_SIZE_BYTES } })
  )
  async upload(
    @Req() request: IRequest,
    @UUIDParam('courseId') courseId: string,
    @UploadedFile() file: Express.Multer.File
  ): Promise<{ success: 1; file: { url: string } }> {
    await this.permissionsService.ensureCourseWritePermission(courseId, request)

    const { filename } = await this.courseFileService.upload(courseId, file)

    return {
      success: 1,
      file: { url: `/api/v1/courses/${courseId}/files/${filename}` },
    }
  }

  @Public()
  @Get(':filename')
  async get(
    @Res({ passthrough: true }) res: Response,
    @UUIDParam('courseId') courseId: string,
    @Param('filename') filename: string
  ): Promise<StreamableFile> {
    const path = this.courseFileService.resolve(courseId, filename)
    res.set('Content-Type', mime.lookup(path) || 'application/octet-stream')
    return new StreamableFile(fs.createReadStream(path))
  }
}
