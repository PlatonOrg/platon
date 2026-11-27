import AdmZip from 'adm-zip'
import * as fs from 'fs'
import * as os from 'os'
import * as Path from 'path'
import { Repo, RESOURCES_DIR } from './repo'

describe('Repo path confinement', () => {
  let sandbox: string
  let root: string
  let outside: string
  let repo: Repo

  beforeEach(async () => {
    sandbox = await fs.promises.realpath(await fs.promises.mkdtemp(Path.join(os.tmpdir(), 'repo-spec-')))
    root = Path.join(sandbox, 'repo')
    outside = Path.join(sandbox, 'outside.txt')
    await fs.promises.writeFile(outside, 'untouched')
    repo = await Repo.get(Path.relative(RESOURCES_DIR, root), { create: true, defaultFiles: {} })
  })

  afterEach(async () => {
    await fs.promises.rm(sandbox, { recursive: true, force: true })
  })

  const read = (path: string) => fs.promises.readFile(path, 'utf8')

  it('accepts a path inside the repository, relative or absolute', async () => {
    await repo.touch('notes.txt', 'one')
    await repo.write(Path.join(root, 'notes.txt'), 'two')

    expect(await read(Path.join(root, 'notes.txt'))).toBe('two')
  })

  it.each([
    ['a relative path', () => '../outside.txt'],
    ['an absolute path', () => outside],
    ['an absolute path that starts inside the repository', () => `${root}/../outside.txt`],
  ])('refuses to write outside the repository through %s', async (_case, path) => {
    await expect(repo.write(path(), 'overwritten')).rejects.toThrow('points to an invalid file')

    expect(await read(outside)).toBe('untouched')
  })

  it('refuses to move a file outside the repository', async () => {
    await repo.touch('notes.txt', 'one')

    await expect(repo.move('notes.txt', `${root}/..`)).rejects.toThrow('points to an invalid file')

    expect(fs.existsSync(Path.join(sandbox, 'notes.txt'))).toBe(false)
  })

  it.each(['.git/config', '.GIT/config', 'folder/../.git/config'])(
    'refuses to write the git directory through %s',
    async (path) => {
      const config = await read(Path.join(root, '.git', 'config'))

      await expect(repo.write(path, '[core]')).rejects.toThrow('points to an invalid file')

      expect(await read(Path.join(root, '.git', 'config'))).toBe(config)
    }
  )

  it.each([
    ['a link to a file outside', 'link', () => outside],
    ['a link to a directory outside', 'link/outside.txt', () => sandbox],
    ['a link to the git directory', 'link/config', () => Path.join(root, '.git')],
  ])('refuses to write through %s', async (_case, path, target) => {
    await fs.promises.symlink(target(), Path.join(root, 'link'))
    const config = await read(Path.join(root, '.git', 'config'))

    await expect(repo.write(path, 'overwritten')).rejects.toThrow('points to an invalid file')

    expect(await read(outside)).toBe('untouched')
    expect(await read(Path.join(root, '.git', 'config'))).toBe(config)
  })

  it('refuses to create a file through a link to a missing file outside', async () => {
    const missing = Path.join(sandbox, 'missing.txt')
    await fs.promises.symlink(missing, Path.join(root, 'link'))

    await expect(repo.touch('link', 'created')).rejects.toThrow('points to an invalid file')

    expect(fs.existsSync(missing)).toBe(false)
  })

  describe('archives', () => {
    // The name is set after the entry is added, which would otherwise clean it up
    const upload = async (entry: string, archive = 'archive.zip') => {
      const zip = new AdmZip()
      zip.addFile('entry', Buffer.from('overwritten')).entryName = entry
      await fs.promises.writeFile(Path.join(root, archive), zip.toBuffer())
    }

    it('extracts the files of an archive', async () => {
      await upload('folder/notes.txt')

      await repo.unzip('archive.zip')

      expect(await read(Path.join(root, 'folder', 'notes.txt'))).toBe('overwritten')
    })

    it.each([
      ['the whole archive', () => repo.unzip('archive.zip')],
      ['one of its files', () => repo.unzipFile('archive.zip', '.git/config')],
    ])('refuses to extract %s into the git directory', async (_case, extract) => {
      await upload('.git/config')
      const config = await read(Path.join(root, '.git', 'config'))

      await expect(extract()).rejects.toThrow('points to an invalid file')

      expect(await read(Path.join(root, '.git', 'config'))).toBe(config)
    })

    it('refuses a git directory written with backslashes', async () => {
      await upload('.git\\config')
      const config = await read(Path.join(root, '.git', 'config'))

      await expect(repo.unzip('archive.zip')).rejects.toThrow('points to an invalid file')

      expect(await read(Path.join(root, '.git', 'config'))).toBe(config)
    })

    it('refuses to extract through a link that a leading `..` seems to avoid', async () => {
      await repo.mkdir('folder')
      await fs.promises.symlink(sandbox, Path.join(root, 'folder', 'link'))
      await upload('../link/outside.txt', 'folder/archive.zip')

      await expect(repo.unzip('folder/archive.zip')).rejects.toThrow('points to an invalid file')

      expect(await read(outside)).toBe('untouched')
    })

    it('refuses to extract through a link to a directory outside', async () => {
      await fs.promises.symlink(sandbox, Path.join(root, 'link'))
      await upload('link/outside.txt')

      await expect(repo.unzip('archive.zip')).rejects.toThrow('points to an invalid file')

      expect(await read(outside)).toBe('untouched')
    })
  })
})
