/**
 * Tests de non-régression : stockage et diffusion des fichiers de cours (branche feature/open-class).
 *
 * - `it(...)` verrouille un comportement correct de la branche.
 * - `it.failing(...)` documente un défaut relevé par l'audit (identifiant AUD-xx) : le test
 *   décrit le comportement attendu et échoue aujourd'hui. Quand le défaut est corrigé, Jest
 *   signale le test : il suffit alors de remplacer `it.failing` par `it`.
 */
import { ConfigService } from '@nestjs/config'
import { IRequest } from '@platon/core/server'
import * as fs from 'fs'
import * as os from 'os'
import { join } from 'path'
import { CoursePermissionsService } from '../permissions/permissions.service'
import { CourseFileController } from './course-file.controller'
import { CourseFileService } from './course-file.service'

const COURSE_A = '11111111-1111-4111-8111-111111111111'
const COURSE_B = '22222222-2222-4222-8222-222222222222'

describe('CourseFileService (non-régression)', () => {
  let rootDir: string
  let service: CourseFileService

  const tempUpload = (originalname: string, content = 'bytes'): Express.Multer.File => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'course-upload-'))
    const path = join(dir, 'multer-tmp')
    fs.writeFileSync(path, content)
    return { path, originalname } as Express.Multer.File
  }

  beforeEach(() => {
    rootDir = fs.mkdtempSync(join(os.tmpdir(), 'course-files-'))
    service = new CourseFileService({ get: () => rootDir } as unknown as ConfigService)
  })

  afterEach(() => fs.rmSync(rootDir, { recursive: true, force: true }))

  it("n'utilise jamais le nom d'origine dans le chemin : un nom malveillant reste dans le dossier du cours", async () => {
    const { filename } = await service.upload(COURSE_A, tempUpload('../../../../etc/passwd.png'))

    expect(filename).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/)
    expect(fs.readdirSync(join(rootDir, COURSE_A))).toEqual([filename])
  })

  it('deux envois du même fichier produisent deux noms distincts (pas d’écrasement)', async () => {
    const a = await service.upload(COURSE_A, tempUpload('photo.png'))
    const b = await service.upload(COURSE_A, tempUpload('photo.png'))

    expect(a.filename).not.toBe(b.filename)
  })

  it.each(['../secret.png', '..', 'sub/dir.png', 'a\\b.png', '.htaccess', '', 'x.png/', 'x..png', '%2e%2e.png'])(
    'resolve() refuse le nom %p (pas de sortie du dossier du cours)',
    (name) => {
      expect(() => service.resolve(COURSE_A, name)).toThrow()
    }
  )

  it("resolve() ne sert pas le fichier d'un cours depuis l'URL d'un autre cours", async () => {
    const { filename } = await service.upload(COURSE_A, tempUpload('photo.png'))

    expect(service.resolve(COURSE_A, filename)).toBe(join(rootDir, COURSE_A, filename))
    expect(() => service.resolve(COURSE_B, filename)).toThrow()
  })

  it('resolve() renvoie une 404 pour un nom valide mais inexistant', () => {
    expect(() => service.resolve(COURSE_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png')).toThrow(/not found/i)
  })

  // AUD-01 : l'extension d'origine est conservée telle quelle, puis le fichier est servi
  // publiquement avec le Content-Type déduit de cette extension. Un .html ou un .svg avec
  // <script> s'exécute alors sur l'origine de PLaTon (XSS stockée, vol du jeton en localStorage).
  it.failing.each(['page.html', 'image.svg', 'script.js', 'page.xhtml'])(
    'AUD-01 refuse les types exécutables par le navigateur (%p)',
    async (name) => {
      await expect(service.upload(COURSE_A, tempUpload(name, '<script>alert(1)</script>'))).rejects.toThrow()
    }
  )

  // AUD-04 : un nom d'origine dont « l'extension » contient un caractère hors [a-zA-Z0-9]
  // donne un fichier stocké mais introuvable (resolve() le refuse) : l'enseignant obtient une URL morte.
  it.failing.each(['photo. png', 'capture.PNG ', 'schéma.pñg', 'image.jpg~'])(
    'AUD-04 tout fichier accepté par upload() doit être relisible (%p)',
    async (name) => {
      const { filename } = await service.upload(COURSE_A, tempUpload(name))
      expect(() => service.resolve(COURSE_A, filename)).not.toThrow()
    }
  )

  // AUD-05 : sans champ « file » dans la requête multipart, `file` vaut undefined et
  // upload() lève une TypeError (erreur 500) au lieu d'une 400 explicite.
  it.failing('AUD-05 upload() sans fichier renvoie une erreur 400', async () => {
    await expect(service.upload(COURSE_A, undefined as unknown as Express.Multer.File)).rejects.toMatchObject({
      status: 400,
    })
  })
})

describe('CourseFileController (non-régression)', () => {
  let rootDir: string
  let service: CourseFileService
  let permissions: jest.Mocked<Pick<CoursePermissionsService, 'ensureCourseWritePermission'>>
  let controller: CourseFileController
  const request = { user: { id: 'teacher-1', role: 'teacher' } } as unknown as IRequest

  const tempUpload = (originalname: string): Express.Multer.File => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'course-upload-'))
    const path = join(dir, 'multer-tmp')
    fs.writeFileSync(path, 'bytes')
    return { path, originalname } as Express.Multer.File
  }

  // Les dossiers sont supprimés en fin de suite : get() ouvre un flux de lecture asynchrone.
  const createdDirs: string[] = []

  beforeEach(() => {
    rootDir = fs.mkdtempSync(join(os.tmpdir(), 'course-files-'))
    createdDirs.push(rootDir)
    service = new CourseFileService({ get: () => rootDir } as unknown as ConfigService)
    permissions = { ensureCourseWritePermission: jest.fn().mockResolvedValue(undefined) }
    controller = new CourseFileController(service, permissions as unknown as CoursePermissionsService)
  })

  afterAll(() => createdDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })))

  // Ferme le flux ouvert par get() pour ne pas lire un fichier supprimé par afterEach.
  const closeStream = (file: unknown) => {
    const f = file as { getStream?: () => fs.ReadStream; stream?: fs.ReadStream }
    ;(f.getStream ? f.getStream() : f.stream)?.destroy()
  }

  it("vérifie le droit d'écriture sur le cours avant de stocker quoi que ce soit", async () => {
    permissions.ensureCourseWritePermission.mockRejectedValue(new Error('forbidden'))
    const spy = jest.spyOn(service, 'upload')

    await expect(controller.upload(request, COURSE_A, tempUpload('a.png'))).rejects.toThrow('forbidden')

    expect(permissions.ensureCourseWritePermission).toHaveBeenCalledWith(COURSE_A, request)
    expect(spy).not.toHaveBeenCalled()
    expect(fs.existsSync(join(rootDir, COURSE_A))).toBe(false)
  })

  it("renvoie l'URL relative attendue par l'outil image/vidéo d'Editor.js", async () => {
    const result = await controller.upload(request, COURSE_A, tempUpload('a.png'))

    expect(result.success).toBe(1)
    expect(result.file.url).toMatch(new RegExp(`^/api/v1/courses/${COURSE_A}/files/[0-9a-f-]+\\.png$`))
  })

  it("sert le fichier avec le Content-Type déduit de l'extension", async () => {
    const { file } = await controller.upload(request, COURSE_A, tempUpload('a.png'))
    const headers: Record<string, string> = {}
    const res = { set: (k: string, v: string) => (headers[k] = v) }

    closeStream(await controller.get(res as never, COURSE_A, file.url.split('/').pop() as string))

    expect(headers['Content-Type']).toBe('image/png')
  })

  // AUD-02 : le fichier temporaire de Multer (./resources/uploads) n'est pas supprimé quand la
  // vérification de droits échoue : n'importe quel enseignant peut remplir le disque (200 Mo par envoi).
  it.failing('AUD-02 supprime le fichier temporaire quand le droit d’écriture est refusé', async () => {
    permissions.ensureCourseWritePermission.mockRejectedValue(new Error('forbidden'))
    const upload = tempUpload('a.png')

    await expect(controller.upload(request, COURSE_A, upload)).rejects.toThrow()

    expect(fs.existsSync(upload.path)).toBe(false)
  })

  // AUD-01 (défense en profondeur) : même si un type dangereux passe, la réponse doit empêcher
  // le navigateur de l'interpréter (nosniff + téléchargement forcé hors images/vidéos/PDF).
  it.failing('AUD-01 envoie X-Content-Type-Options: nosniff', async () => {
    const { file } = await controller.upload(request, COURSE_A, tempUpload('a.png'))
    const headers: Record<string, string> = {}
    const res = { set: (k: string, v: string) => (headers[k] = v), setHeader: (k: string, v: string) => (headers[k] = v) }

    closeStream(await controller.get(res as never, COURSE_A, file.url.split('/').pop() as string))

    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })
})
