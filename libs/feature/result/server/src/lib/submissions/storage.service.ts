import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs-extra'
import * as crypto from 'crypto'
import { join } from 'path'
import { createReadStream } from 'fs'
import { PassThrough, Readable } from 'stream'
import * as tar from 'tar-stream'
import { StudentSubmissionEntity } from './submission.entity'

@Injectable()
export class SubmissionStorageService {
  private readonly logger = new Logger(SubmissionStorageService.name)
  private readonly submissionsDir: string

  constructor(private configService: ConfigService) {
    const baseDir = this.configService.get<string>('SUBMISSIONS_DIR') || './resources/uploads/submissions'
    this.submissionsDir = baseDir
    this.initializeDirectories()
  }

  private initializeDirectories() {
    try {
      fs.ensureDirSync(this.submissionsDir)
      this.logger.log(`Submissions directory initialized at ${this.submissionsDir}`)
    } catch (error: any) {
      this.logger.error(`Failed to initialize submissions directory: ${error}`)
      throw error
    }
  }

  /**
   * Génère le chemin de stockage pour une soumission
   */
  private getSubmissionPath(sessionId: string, userId: string, version: number, fileName: string): string {
    const dirPath = join(this.submissionsDir, sessionId, userId)
    const filePath = join(dirPath, `v${version}_${this.sanitizeFileName(fileName)}`)
    return filePath
  }

  /**
   * Récupère le répertoire de soumission pour une session/utilisateur
   */
  private getSessionUserDir(sessionId: string, userId: string): string {
    return join(this.submissionsDir, sessionId, userId)
  }

  /**
   * Nettoie le nom du fichier
   */
  protected sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  /**
   * Enregistre un fichier uploadé
   */
  async saveFile(
    buffer: Buffer,
    sessionId: string,
    userId: string,
    fileName: string,
    version: number
  ): Promise<{ filePath: string; checksum: string; fileSize: number }> {
    try {
      const filePath = this.getSubmissionPath(sessionId, userId, version, fileName)
      const dirPath = join(this.submissionsDir, sessionId, userId)

      await fs.ensureDir(dirPath)
      await fs.writeFile(filePath, buffer)

      const checksum = this.calculateChecksum(buffer)
      this.logger.log(`File saved: ${filePath} (size: ${buffer.length} bytes)`)

      return {
        filePath,
        checksum,
        fileSize: buffer.length,
      }
    } catch (error) {
      this.logger.error(`Failed to save file: ${error}`)
      throw error
    }
  }

  /**
   * Récupère un fichier
   */
  async getFile(sessionId: string, userId: string, version: number, fileName: string): Promise<Buffer> {
    try {
      const filePath = this.getSubmissionPath(sessionId, userId, version, fileName)

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      const buffer = await fs.readFile(filePath)
      return buffer
    } catch (error) {
      this.logger.error(`Failed to retrieve file: ${error}`)
      throw error
    }
  }

  /**
   * Crée une archive TAR des soumissions en streaming (mémoire faible)
   * Les données sont ajoutées au fur et à mesure sans tout charger en mémoire
   * @param submissions Liste des soumissions à archiver
   * @returns Objet contenant le stream PassThrough et le titre de l'exercice
   */
  async getAllSubmissionsZip(submissions: StudentSubmissionEntity[]): Promise<{ stream: PassThrough; title: string }> {
    if (!submissions.length) throw new Error('No submissions to archive')
    try {
      const passThrough = new PassThrough()

      const exerciseTitle = this.sanitizeFileName(submissions[0]?.session?.variables?.title) || 'submissions'
      const pack = tar.pack()

      pack.on('error', (err: Error) => {
        this.logger.error(`Failed to create tar archive: ${err}`)
        passThrough.destroy(err)
      })

      pack.pipe(passThrough as unknown as NodeJS.WritableStream)

      setImmediate(async () => {
        try {
          for (const submission of submissions) {
            try {
              const fileStream = this.getFileStream(
                submission.sessionId,
                submission.userId,
                submission.version,
                submission.fileName
              )

              const filePath = this.getSubmissionPath(
                submission.sessionId,
                submission.userId,
                submission.version,
                submission.fileName
              )

              const stat = fs.statSync(filePath)
              const header = {
                name: `${exerciseTitle}-submissions/${submission.user.username}/${submission.fileName}`,
                size: stat.size,
              }
              const entry = pack.entry(header, (err?: Error | null) => {
                if (err) {
                  this.logger.warn(`Failed to add entry to tar archive: ${err}`)
                }
              })

              fileStream.pipe(entry as unknown as NodeJS.WritableStream)
              await new Promise<void>((resolve, reject) => {
                entry.on('finish', resolve)
                entry.on('error', reject)
              })
            } catch (error) {
              this.logger.warn(`Failed to add file to archive: ${error}`)
              // Continue malgré l'erreur
            }
          }

          pack.finalize()
        } catch (error) {
          this.logger.error(`Failed to process submissions tar: ${error}`)
          passThrough.destroy(error as Error)
        }
      })

      return {
        stream: passThrough,
        title: exerciseTitle,
      }
    } catch (error) {
      this.logger.error(`Failed to get all submissions tar: ${error}`)
      throw error
    }
  }

  /**
   * Crée un stream de lecture pour un fichier (pour les gros fichiers)
   */
  getFileStream(sessionId: string, userId: string, version: number, fileName: string): Readable {
    const filePath = this.getSubmissionPath(sessionId, userId, version, fileName)

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    return createReadStream(filePath)
  }

  /**
   * Supprime toutes les versions d'une soumission
   */
  async deleteAllVersions(sessionId: string, userId: string): Promise<void> {
    try {
      const dirPath = this.getSessionUserDir(sessionId, userId)

      if (fs.existsSync(dirPath)) {
        await fs.remove(dirPath)
        this.logger.log(`Deleted all submissions for session ${sessionId}, user ${userId}`)
      }
    } catch (error) {
      this.logger.error(`Failed to delete submissions: ${error}`)
      throw error
    }
  }

  /**
   * Supprime une version spécifique
   */
  async deleteVersion(sessionId: string, userId: string, version: number, fileName: string): Promise<void> {
    try {
      const filePath = this.getSubmissionPath(sessionId, userId, version, fileName)

      if (fs.existsSync(filePath)) {
        await fs.remove(filePath)
        this.logger.log(`Deleted submission version: ${filePath}`)
      }
    } catch (error) {
      this.logger.error(`Failed to delete version: ${error}`)
      throw error
    }
  }

  /**
   * Liste toutes les versions d'une soumission
   */
  async listVersions(sessionId: string, userId: string): Promise<string[]> {
    try {
      const dirPath = this.getSessionUserDir(sessionId, userId)

      if (!fs.existsSync(dirPath)) {
        return []
      }

      const files = await fs.readdir(dirPath)
      return files.sort().reverse() // Récent en premier
    } catch (error) {
      this.logger.error(`Failed to list versions: ${error}`)
      throw error
    }
  }

  /**
   * Calcule le checksum SHA256 d'un buffer
   */
  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Vérifie l'intégrité d'un fichier
   */
  async verifyIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath)
      const actualChecksum = this.calculateChecksum(buffer)
      return actualChecksum === expectedChecksum
    } catch (error) {
      this.logger.error(`Failed to verify integrity: ${error}`)
      return false
    }
  }

  /**
   * Obtient des statistiques sur les fichiers stockés
   */
  async getStorageStats(sessionId?: string, userId?: string): Promise<{ totalSize: number; fileCount: number }> {
    try {
      let searchDir = this.submissionsDir

      if (sessionId && userId) {
        searchDir = this.getSessionUserDir(sessionId, userId)
      } else if (sessionId) {
        searchDir = join(this.submissionsDir, sessionId)
      }

      if (!fs.existsSync(searchDir)) {
        return { totalSize: 0, fileCount: 0 }
      }

      let totalSize = 0
      let fileCount = 0

      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir) as string[]
        files.forEach((file: string) => {
          const filePath = join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            totalSize += stat.size
            fileCount++
          } else if (stat.isDirectory()) {
            walkDir(filePath)
          }
        })
      }

      walkDir(searchDir)
      return { totalSize, fileCount }
    } catch (error) {
      this.logger.error(`Failed to get storage stats: ${error}`)
      throw error
    }
  }
}
