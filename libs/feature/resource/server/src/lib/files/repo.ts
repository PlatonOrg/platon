import { StreamableFile } from '@nestjs/common'
import { FileTypes, FileVersion, FileVersions, ResourceFile, ResourceTypes } from '@platon/feature/resource/common'
import {
  FileExistsError,
  FileNotFoundError,
  isDirectory,
  isFile,
  NotADirectoryError,
  PermissionError,
  uniquifyFileName,
  withTempFile,
} from '@platon/shared/server'
import * as fs from 'fs'
import * as git from 'isomorphic-git'
import * as Path from 'path'
import { simpleGit } from 'simple-git'

const BASE = Path.join(process.cwd(), 'resources')
const ROOT = '.'
const DEFAULT_BRANCH = 'main'

export const LATEST = 'latest'

interface User {
  name: string
  email?: string
}

type Node = ResourceFile

const removeLeadingSlash = (path: string) => (path.startsWith('/') ? path.slice(1) : path)

export class Repo {
  private ignoreCommits = false
  private readonly resource = this.root.split('/').pop() as string
  private readonly repo = {
    fs,
    dir: this.root,
  }

  private constructor(
    private readonly root: string,
    private readonly user: User
  ) {}

  static async get(
    name: string,
    options?: {
      user?: User
      create?: boolean
      type?: ResourceTypes
    }
  ) {
    const dir = Path.join(BASE, name)
    const exists = fs.existsSync(dir)
    if (!exists && !options?.create) {
      throw new FileNotFoundError(name)
    }

    const instance = new Repo(dir, {
      name: options?.user?.name || 'noname',
      email: options?.user?.email || 'noname',
    })

    if (!exists) {
      await git.init({ fs, dir, defaultBranch: DEFAULT_BRANCH })
      try {
        await fs.promises.cp(Path.join(BASE, 'templates', options?.type?.toLowerCase() as string), dir, {
          recursive: true,
          force: true,
        })
      } catch {
        // can throw error if called twice by the frontend
      }
      await instance.commit('init')
    }

    return instance
  }

  // Creation

  exists(path: string) {
    return fs.existsSync(this.abspath(path))
  }

  isDir(path: string) {
    return isDirectory(this.abspath(path))
  }

  isFile(path: string) {
    return isFile(this.abspath(path))
  }

  /**
   * Creates a new directory at the given `path`
   * @param path  A path relative to the directory.
   * @throws
   * `TypeError`: If `path` is null or empty.
   * `FileNotFoundError`: If parent of  `path` does not points to an existing directory.
   * `FileExistsError`: If `path` points to an existing file.
   * `PermissionError`: If `path` points to a file outside of the current directory.
   */
  async mkdir(path: string): Promise<void> {
    const abspath = this.abspath(path)
    await fs.promises.mkdir(abspath)
    await fs.promises.writeFile(Path.join(abspath, '.keep'), '') // allow to list empty directories
    await this.commit(`create ${path}`)
  }

  /**
   * Creates a new file at the given `path`
   * @param path A path relative to the current directory.
   * @param content Initial content of the file.
   * @throws
   * - `TypeError`: If `path` is null or empty.
   * - `FileNotFoundError`: If parent of `path` does not points to an existing directory.
   * - `FileExistsError`: If `path` points to an existing file.
   * - `PermissionError`: If `path` points to a file outside of the current directory.
   */
  async touch(path: string, content?: string): Promise<void> {
    const abspath = this.abspath(path)
    await fs.promises.writeFile(abspath, content || '')
    await this.commit(`create ${path}`)
  }

  /**
   * Moves the file/folder `src` to `dst`
   * @param src Source file/directory path to move relative to the current directory.
   * @param dst Target directory path relative to the current directory.
   * @param copy Copy Source instead of moving?
   * @throws
   * - `TypeError`: If any of `src` is null or empty.
   * - `PermissionError`: If the operation is not permitted.
   */
  async move(src: string, dst: string, copy = false) {
    const absSrcPath = this.abspath(src)
    let absDstPath = this.abspath(dst, true)

    if (!isDirectory(absDstPath)) {
      throw new NotADirectoryError(dst)
    }

    //  move inside the same directory
    if (!copy && Path.dirname(absSrcPath) === Path.resolve(absDstPath)) {
      return
    }

    absDstPath = uniquifyFileName(absDstPath, Path.basename(absSrcPath))
    if (copy) {
      if (isDirectory(absSrcPath)) {
        await fs.promises.cp(absSrcPath, absDstPath, { recursive: true })
      } else {
        await fs.promises.copyFile(absSrcPath, absDstPath, fs.constants.COPYFILE_EXCL)
      }
    } else {
      await fs.promises.rename(absSrcPath, absDstPath)
    }

    await this.commit(`${copy ? 'copy' : 'move'} ${src} to ${dst}`)
  }

  /**
   * Rename `oldPath` to `newPath`.
   * @param oldPath (str): Path to the file to rename (relative to the current directory).
   * @param newPath Path to the new file name (relative to the current directory).
   * @throws
   * - `FileNotFoundError`: If `oldPath` does not points to an existing file.
   * - `FileExistsError`: If `newPath` points to an existing file.
   * - `PermissionError`: If `oldPath` or `newPath` points to a file outside of the current directory.
   * - `PermissionError`: If `oldPath` and `newPath` does not have the same parent.
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const oabspath = this.abspath(oldPath)
    const nabspath = this.abspath(newPath)

    if (!this.exists(oabspath)) throw new FileNotFoundError(oldPath)

    if (this.exists(nabspath)) throw new FileExistsError(oldPath)

    if (Path.dirname(oabspath) !== Path.dirname(nabspath)) {
      throw new PermissionError('new file name should be inside the same directory')
    }

    await fs.promises.rename(oabspath, nabspath)
    await this.commit(`rename ${oldPath} to ${newPath}`)
  }

  /**
   * Delete the file/folder (recursive) at the given `path`.
   * @param path
   * @throws
   * - `TypeError`: If `path` is null or empty.
   * - `FileNotFoundError`: If `path` does not exists.
   * - `PermissionError`: If `oldpath` or `newpath` points to a file outside of the current directory.
   */
  async remove(path: string): Promise<void> {
    const abspath = this.abspath(path)
    if (!this.exists(abspath)) {
      throw new FileNotFoundError('path')
    }
    await fs.promises.rm(abspath, { recursive: true })
    await this.commit(`delete ${path}`)
  }

  // Write/Read

  async read(path = ROOT, version = LATEST): Promise<[Node, Promise<Uint8Array>?]> {
    path = removeLeadingSlash(path || ROOT)

    const ref = version === 'latest' ? 'HEAD' : version
    const prefix = path === ROOT ? '' : path

    let match: Node | undefined
    let download: Promise<Uint8Array> | undefined

    await git.walk({
      ...this.repo,
      trees: [git.TREE({ ref })],
      map: async (filepath, [entry]) => {
        if (match && match.type === 'file') return

        if (filepath !== ROOT && (!filepath.startsWith(prefix) || Path.basename(filepath).startsWith('.'))) return

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [oid, type] = await Promise.all([entry!.oid(), entry!.type()])

        const base = `/api/v1/files/${this.resource}/${filepath === '.' ? '' : filepath}`

        const node: Node = {
          oid,
          type: type === 'tree' ? FileTypes.folder : FileTypes.file,
          path: filepath,
          version: version === 'HEAD' ? LATEST : version,
          url: `${base}?version=${version}`,
          bundleUrl: `${base}?bundle`,
          resourceId: this.resource,
          describeUrl: `${base}?describe`,
          downloadUrl: `${base}?download&version=${version}`,
        }

        if (filepath === path) {
          match = node
          if (type === 'blob') {
            match = node
            download = entry?.content() as Promise<Uint8Array>
          }
        }
        return node
      },
      reduce: (parent, children) => {
        if (parent && parent.type !== FileTypes.file) {
          Object.assign(parent, { children })
        }
        return parent
      },
    })

    if (!match) {
      throw new FileNotFoundError(path)
    }

    return [match, download]
  }

  /**
   * Write data into the file at `path`.
   * @param path A path relative to the directory.
   * @param data data to write.
   * @throws
   * - `TypeError`: If `path` is null or empty.
   * - `FileNotFoundError`: If `path` does not points to an existing file.
   * - `PermissionError`: If `path` points to a file outside of the current directory.
   */
  async write(path: string, data: string | Buffer) {
    const abspath = this.abspath(path)
    if (!this.exists(abspath)) {
      throw new FileNotFoundError(abspath)
    }
    await fs.promises.writeFile(abspath, data)
    await this.commit(`update ${path}`)
  }

  async upload(src: string, dst: string) {
    const abspath = this.abspath(dst)
    const dirname = Path.dirname(abspath)
    const basename = Path.basename(abspath)
    await fs.promises.rename(src, uniquifyFileName(dirname, basename))
    await this.commit(`upload ${dst}`)
  }

  // Git

  async commit(message: string): Promise<boolean> {
    if (this.ignoreCommits) return false

    // add all
    await git
      .statusMatrix(this.repo)
      .then((status) =>
        Promise.all(
          status.map(([filepath, , worktreeStatus]) =>
            worktreeStatus ? git.add({ ...this.repo, filepath }) : git.remove({ ...this.repo, filepath })
          )
        )
      )

    await git.commit({
      ...this.repo,
      message,
      author: this.user,
      committer: this.user,
    })

    return true
  }

  async bundle(version = LATEST) {
    return await withTempFile(
      async (path) => {
        await simpleGit(this.root).raw('bundle', 'create', path, 'HEAD', version === LATEST ? DEFAULT_BRANCH : 'latest')
        const file = fs.createReadStream(path)
        return new StreamableFile(file)
      },
      { prefix: 'bundles', suffix: '.git', cleanup: false }
    )
  }

  async archive(path = ROOT, version = LATEST) {
    version = version === LATEST ? 'HEAD' : version
    return withTempFile(
      async (tmppath) => {
        await simpleGit(this.repo.dir).raw(['archive', '-o', tmppath, `${version}:${path}`])
        return tmppath
      },
      { prefix: 'archives', suffix: '.zip', cleanup: false }
    )
  }

  async search(options: { query: string; matchWord?: boolean; matchCase?: boolean; useRegex?: boolean }) {
    if (!options.query) {
      throw new TypeError('query is required')
    }

    const { query, matchCase, matchWord, useRegex } = options

    const args: string[] = []

    args.push('-I') // no binary files

    if (!useRegex) {
      args.push('-F')
    }

    if (matchWord) {
      args.push('-w')
    }

    if (!matchCase) {
      args.push('-i')
    }

    return simpleGit(this.root).grep(query, args)
  }

  async versions(): Promise<FileVersions> {
    const tags = await simpleGit(this.repo.dir).tags({
      '--format': '%(refname:lstrip=2) %(taggername) %(taggeremail) %(creatordate:iso-strict) %(subject)',
    })

    const parse = (tag: string): FileVersion => {
      const [name, taggerName, taggerEmail, createdAt, message] = tag.split(' ')
      return {
        tag: name,
        tagger: {
          name: taggerName,
          email: taggerEmail,
        },
        createdAt: createdAt,
        message: message,
      }
    }

    return {
      all: tags.all.map(parse),
      latest: tags.latest ? parse(tags.latest) : undefined,
    }
  }

  async release(name: string, message: string): Promise<void> {
    await git.annotatedTag({
      ...this.repo,
      message,
      ref: name,
      tagger: this.user,
    })
  }

  async describe(): Promise<string> {
    return simpleGit(this.root).raw('describe', '--always')
  }

  async withNoCommit<T = unknown>(consumer: () => Promise<T>): Promise<T> {
    this.ignoreCommits = true
    try {
      return await consumer()
    } finally {
      this.ignoreCommits = false
    }
  }

  private abspath(path = ROOT, authorizeRoot = false) {
    path = (path || ROOT).trim()
    if (path.startsWith('/')) {
      // ensure that path does not point to a file outside of self.root
      if (!path.startsWith(this.root + '/')) {
        throw new PermissionError(`${path}: points to an invalid file`)
      }
      return path
    }

    if (path === '.') {
      if (authorizeRoot) return this.root
      throw new PermissionError('path should not points to root.')
    }

    // ensure that path does not point to a file outside of self.root
    const abspath = Path.resolve(Path.join(this.root, path))
    if (!abspath.startsWith(this.root + '/')) {
      throw new PermissionError(`${path}: points to an invalid file`)
    }
    return abspath
  }
}
