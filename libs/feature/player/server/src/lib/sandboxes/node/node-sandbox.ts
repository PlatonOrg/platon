/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs'
import * as Path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { NodeVM } from 'vm2'

import { Injectable } from '@nestjs/common'
import { Sandbox, SandboxError, SandboxInput, SandboxOutput } from '@platon/feature/player/common'
import { RegisterSandbox } from '../sandbox'
import { createNodeSandboxAPI } from './node-sandbox-api'
import { constants } from 'fs'

/**
 * Directory where environment files are stored.
 */
const ENVS_DIR = Path.join(process.cwd(), 'envs')

/**
 * List of built-in global variables.
 */
const builtinGlobales = [
  'global',
  'Function',
  'eval',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'process',
  'console',
]

@Injectable()
@RegisterSandbox()
export class NodeSandbox implements Sandbox {
  supports(input: SandboxInput): boolean {
    const { sandbox } = input.variables
    return !sandbox || sandbox === 'node'
  }

  /**
   * Executes the provided script in the NodeVM sandbox.
   * @param input - The SandboxInput object.
   * @param script - The script to be executed.
   * @param timeout - The execution timeout in milliseconds.
   * @returns A Promise that resolves to the SandboxOutput object.
   * @throws {SandboxError} If an error occurs during script execution.
   */
  async run(input: SandboxInput, script: string, timeout: number): Promise<SandboxOutput> {
    const { vm, envid } = await this.withVm(input, timeout)
    try {
      if (script.length) {
        vm.run(script)
      }
    } catch (error) {
      throw SandboxError.unknownError(error)
    }

    return {
      envid,
      variables: {
        ...input.variables,
        ...this.jsonify(vm.getGlobal('global')),
      },
    }
  }

  /**
   * Creates a NodeVM with the provided sandbox and sets up the environment.
   * @param input - The SandboxInput object.
   * @param timeout - The execution timeout in milliseconds.
   * @returns An object containing the NodeVM and environment details.
   */
  private async withVm(input: SandboxInput, timeout: number) {
    const exists = async (path: string) => {
      try {
        await fs.promises.access(path, constants.F_OK)
        return true
      } catch {
        return false
      }
    }

    const envid = input.envid || uuidv4()
    const baseDir = Path.join(ENVS_DIR, envid)

    if (input.files?.length && !(await exists(baseDir))) {
      await fs.promises.mkdir(baseDir)
      await Promise.all([
        ...input.files.map((file) => fs.promises.writeFile(Path.join(baseDir, file.path), file.content)),
      ])
    }

    const sandbox = createNodeSandboxAPI(baseDir)

    Object.assign(sandbox, input.variables)

    return {
      envid,
      timeout,
      sandbox,
      vm: new NodeVM({ sandbox }),
    }
  }

  /**
   * Converts the provided global variables object to JSON format.
   * @param globals - The global variables object.
   * @returns The JSON representation of the global variables.
   */
  private jsonify(globals: any) {
    return Object.keys(globals)
      .filter((key) => !builtinGlobales.includes(key))
      .reduce((acc, curr) => {
        if (typeof globals[curr] !== 'function') {
          acc[curr] = globals[curr]
        }
        return acc
      }, {} as any)
  }
}
