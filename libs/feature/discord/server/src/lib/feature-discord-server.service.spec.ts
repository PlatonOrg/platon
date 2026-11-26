import { Test } from '@nestjs/testing'
import { FeatureDiscordServerService, agent, httpsproxyagent } from './feature-discord-server.service'
import { GatewayIntentBits } from 'discord.js'

describe('FeatureDiscordServerService', () => {
  let service: FeatureDiscordServerService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FeatureDiscordServerService],
    }).compile()

    service = module.get(FeatureDiscordServerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should create Discord options', () => {
    const options = service.createDiscordOptions()
    expect(options).toBeDefined()
    expect(options.token).toEqual(process.env['DISCORD_BOT_TOKEN'])
    expect(options.discordClientOptions).toBeDefined()
    expect(options.discordClientOptions.intents).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ])
    expect(options.discordClientOptions.rest).toBeDefined()
    expect(options.discordClientOptions?.rest?.agent).toEqual(agent)
    expect(options.discordClientOptions.ws).toBeDefined()
    expect(options.discordClientOptions.ws?.proxyAgentOptions).toEqual(httpsproxyagent)
  })

  describe('proxy variables', () => {
    const variables = ['https_proxy', 'HTTPS_PROXY']
    const previous = new Map(variables.map((name) => [name, process.env[name]]))

    // The proxy is chosen when the module is loaded
    const loadProxy = async (env: Record<string, string>) => {
      variables.forEach((name) => delete process.env[name])
      Object.assign(process.env, env)
      let loaded: typeof import('./feature-discord-server.service') | undefined
      await jest.isolateModulesAsync(async () => {
        loaded = await import('./feature-discord-server.service')
      })
      return loaded?.httpsproxyagent as unknown as { proxy: { host: string } } | null
    }

    afterEach(() => {
      previous.forEach((value, name) => {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      })
    })

    it('should follow https_proxy', async () => {
      const proxyAgent = await loadProxy({ https_proxy: 'http://standard.invalid:3128' })
      expect(proxyAgent?.proxy.host).toBe('standard.invalid')
    })

    it('should use no proxy when none is set', async () => {
      expect(await loadProxy({})).toBeNull()
    })
  })
})
