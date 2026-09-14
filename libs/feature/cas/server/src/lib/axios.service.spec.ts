import { ConfigService } from '@nestjs/config'
import axios from 'axios-https-proxy-fix'
import { AxiosService } from './axios.service'

jest.mock('axios-https-proxy-fix', () => ({
  get: jest.fn(),
}))

describe('AxiosService', () => {
  const buildConfigService = (values: Record<string, unknown>) =>
    ({ get: jest.fn((key: string) => values[key]) } as unknown as ConfigService)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("ne devrait pas configurer de proxy si l'hôte ou le port sont absents", async () => {
    ;(axios.get as jest.Mock).mockResolvedValue({ data: {} })
    const service = new AxiosService(buildConfigService({}))

    await service.get('https://example.test')

    expect(axios.get).toHaveBeenCalledWith('https://example.test', {})
  })

  it('devrait configurer le proxy quand host et port sont tous deux définis', async () => {
    ;(axios.get as jest.Mock).mockResolvedValue({ data: {} })
    const service = new AxiosService(buildConfigService({ PROXY_CONFIG_HOST: 'proxy.local', PROXY_CONFIG_PORT: 8080 }))

    await service.get('https://example.test')

    expect(axios.get).toHaveBeenCalledWith(
      'https://example.test',
      expect.objectContaining({ proxy: { host: 'proxy.local', port: 8080 } })
    )
  })

  it('devrait retourner la réponse axios', async () => {
    const response = { data: { hello: 'world' } }
    ;(axios.get as jest.Mock).mockResolvedValue(response)
    const service = new AxiosService(buildConfigService({}))

    const result = await service.get('https://example.test')

    expect(result).toBe(response)
  })
})
