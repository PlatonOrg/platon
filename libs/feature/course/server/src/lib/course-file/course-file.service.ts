import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { extname, join, resolve } from 'path'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// Noms de fichiers générés par nos soins (uuid + extension d'origine) : cette contrainte
// stricte évite tout besoin de résoudre/valider un chemin arbitraire fourni par le client
// (pas de sous-dossier, pas de `..` possible) pour servir les fichiers de cours.
const SAFE_FILENAME_RE = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9]+)?$/

@Injectable()
export class CourseFileService {
  private readonly rootDir: string

  constructor(private readonly configService: ConfigService) {
    const baseDir = this.configService.get<string>('COURSE_FILES_DIR') || './resources/courses'
    this.rootDir = resolve(baseDir)
  }

  private coursesDir(courseId: string): string {
    return join(this.rootDir, courseId)
  }

  async upload(courseId: string, file: Express.Multer.File): Promise<{ filename: string }> {
    const dir = this.coursesDir(courseId)
    await fs.promises.mkdir(dir, { recursive: true })

    const filename = `${uuidv4()}${extname(file.originalname)}`
    await fs.promises.rename(file.path, join(dir, filename))

    return { filename }
  }

  resolve(courseId: string, filename: string): string {
    if (!SAFE_FILENAME_RE.test(filename)) {
      throw new NotFoundException(`File not found: ${filename}`)
    }

    const path = join(this.coursesDir(courseId), filename)
    if (!fs.existsSync(path)) {
      throw new NotFoundException(`File not found: ${filename}`)
    }

    return path
  }
}
