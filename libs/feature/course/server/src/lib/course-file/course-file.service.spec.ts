import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as os from 'os'
import { join } from 'path'
import { CourseFileService } from './course-file.service'

describe('CourseFileService', () => {
  let service: CourseFileService
  let rootDir: string

  beforeEach(async () => {
    rootDir = fs.mkdtempSync(join(os.tmpdir(), 'course-file-service-'))

    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseFileService, { provide: ConfigService, useValue: { get: () => rootDir } }],
    }).compile()

    service = module.get(CourseFileService)
  })

  afterEach(() => fs.rmSync(rootDir, { recursive: true, force: true }))

  const writeTempUpload = (content = 'fake-image-bytes'): { path: string; originalname: string } => {
    const path = fs.mkdtempSync(join(os.tmpdir(), 'upload-')) + '/tmp-upload'
    fs.writeFileSync(path, content)
    return { path, originalname: 'my photo.png' }
  }

  it('stocke le fichier sous <root>/<courseId>/<uuid>.<extension d’origine>', async () => {
    const upload = writeTempUpload()

    const { filename } = await service.upload('course-1', upload as Express.Multer.File)

    expect(filename).toMatch(/^[0-9a-f-]+\.png$/)
    expect(fs.existsSync(join(rootDir, 'course-1', filename))).toBe(true)
  })

  it('resolve() retourne le chemin absolu du fichier existant', async () => {
    const upload = writeTempUpload()
    const { filename } = await service.upload('course-1', upload as Express.Multer.File)

    expect(service.resolve('course-1', filename)).toBe(join(rootDir, 'course-1', filename))
  })

  it('resolve() rejette un nom de fichier inexistant', () => {
    expect(() => service.resolve('course-1', 'inexistant.png')).toThrow()
  })

  it.each([['../../etc/passwd'], ['..%2F..%2Fetc%2Fpasswd'], ['sub/dir.png'], ['a/../../b.png'], ['.png'], ['']])(
    'resolve() rejette un nom de fichier non sûr: %s',
    (unsafe) => {
      expect(() => service.resolve('course-1', unsafe)).toThrow()
    }
  )

  it("isole les fichiers par cours (un courseId ne peut pas lire le fichier d'un autre)", async () => {
    const upload = writeTempUpload()
    const { filename } = await service.upload('course-1', upload as Express.Multer.File)

    expect(() => service.resolve('course-2', filename)).toThrow()
  })
})
