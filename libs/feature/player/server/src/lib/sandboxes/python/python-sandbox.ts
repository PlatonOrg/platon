import FormData from 'form-data'
import * as fs from 'fs'
import * as tar from 'tar-stream'
import * as zlib from 'zlib'

import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'

import { ConfigService } from '@nestjs/config'
import { Configuration } from '@platon/core/server'
import { Sandbox, SandboxError, SandboxInput, SandboxOutput } from '@platon/feature/player/common'
import { withTempFile } from '@platon/shared/server'
import { RegisterSandbox } from '../sandbox'
import { pythonRunnerScript } from './python-scripts'

interface ExecutionResult {
  status: number
  execution: {
    exit_code: number
    stdout: string
    stderr: string
    time: number
  }[]
  total_time: number
  result: string
  environment: string
  expire: string
}

@Injectable()
@RegisterSandbox()
export class PythonSandbox implements Sandbox {
  constructor(private readonly http: HttpService, private readonly config: ConfigService<Configuration>) {}

  supports(input: SandboxInput): boolean {
    const { sandbox } = input.variables
    return sandbox === 'python'
  }

  /**
   * Executes the Python sandbox with the provided input and script.
   * @param input The SandboxInput object.
   * @param script The Python script to execute.
   * @param timeout The timeout value for the execution.
   * @returns A Promise that resolves to a SandboxOutput object.
   * @throws {SandboxError} If an error occurs during execution.
   */
  async run(input: SandboxInput, script: string, timeout: number): Promise<SandboxOutput> {
    try {
      const response = await withTempFile(
        async (path) => {
          const isEnvSaved: boolean = await firstValueFrom(
            this.http.head(`${this.config.get('sandbox.url', { infer: true })}/environment/${input.envid}`)
          )
            .then((response) => (response.status === 200 ? true : false))
            .catch(() => false)
          await this.withEnvFiles(script, input, path, isEnvSaved)

          const data = new FormData()

          data.append(
            'config',
            JSON.stringify({
              save: true,
              commands: ['python3 runner.py'],
              result_path: 'output.json',
              ...(input.envid && isEnvSaved ? { environment: input.envid } : {}),
            })
          )

          data.append('environment', await fs.promises.readFile(path), { filename: 'environment' })

          let url = this.config.get('sandbox.url', { infer: true }) as string
          if (!url.endsWith('/')) {
            url += '/'
          }

          const result = await firstValueFrom(
            this.http.post<ExecutionResult>(`${url}execute/`, data, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout,
            })
          )
          return result.data
        },
        { prefix: 'envs', suffix: '.tgz', cleanup: false }
      )

      if (response.status === -2) {
        throw SandboxError.timeoutError(timeout)
      }

      if (response.status !== 0) {
        throw SandboxError.unknownError(response.execution[0].stderr)
      }

      return {
        envid: response.environment,
        variables: JSON.parse(response.result),
      }
    } catch (error) {
      if (error instanceof SandboxError) {
        throw error
      }
      throw SandboxError.unknownError(error)
    }
  }

  /**
   * Packs the environment files into a tarball with gzip compression.
   * @param script The Python script.
   * @param input The SandboxInput object.
   * @param path The path of the temporary file to create.
   * @param isEnvSaved A boolean indicating whether the environment is already saved.
   */
  private async withEnvFiles(script: string, input: SandboxInput, path: string, isEnvSaved: boolean) {
    const pack = tar.pack()

    pack.entry({ name: 'script.py' }, script || '')
    pack.entry({ name: 'variables.json' }, JSON.stringify(input.variables))

    if (!isEnvSaved) {
      pack.entry({ name: 'runner.py' }, pythonRunnerScript)
      input.files?.forEach((file) => pack.entry({ name: file.path }, file.content || ''))
    }

    pack.finalize()

    const gzip = zlib.createGzip()
    const stream = fs.createWriteStream(path)
    pack.pipe(gzip).pipe(stream)

    await new Promise<void>((resolve, reject) => {
      stream.on('error', reject)
      stream.on('finish', resolve)
    })
  }
}
