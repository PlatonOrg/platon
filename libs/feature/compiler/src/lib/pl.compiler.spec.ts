import { PLCompiler } from './pl.compiler'

describe('PLCompiler variable assignment', () => {
  const compile = async (content: string) => {
    const compiler = new PLCompiler({
      resource: 'r',
      version: 'latest',
      main: 'main.ple',
      resolver: { exists: async () => false } as never,
    })
    await compiler.compile(content)
    const source = await compiler.output()
    return { source, variables: source.variables as Record<string, unknown> }
  }

  afterEach(() => {
    // A test that slips through still leaves no trace on the shared prototype.
    delete (Object.prototype as unknown as Record<string, unknown>)['probe']
  })

  it('assigns a nested variable', async () => {
    const { variables } = await compile('a.b = "value"\n')

    expect(variables['a']).toEqual({ b: 'value' })
  })

  it.each(['__proto__.probe', 'a.__proto__.probe', 'constructor.prototype.probe', 'prototype.probe'])(
    'refuses to assign through %s',
    async (name) => {
      const { source } = await compile(`${name} = "reached"\n`)

      expect(source.errors).not.toEqual([])
      expect(({} as Record<string, unknown>)['probe']).toBeUndefined()
    }
  )

  it('refuses to read a variable through __proto__', async () => {
    const { source } = await compile('a = __proto__.probe\n')

    expect(source.errors).not.toEqual([])
  })
})
