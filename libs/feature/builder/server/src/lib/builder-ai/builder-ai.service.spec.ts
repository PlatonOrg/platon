import { Test } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { AxiosResponse } from 'axios'
import { of, throwError } from 'rxjs'
import { AITransformInput } from '@platon/feature/builder/common'
import { AnthropicResponse, MistralResponse, OpenAIResponse } from './builder-ai.models'
import { BuilderAiService } from './builder-ai.service'

describe('BuilderAiService', () => {
  let service: BuilderAiService
  let httpService: jest.Mocked<Pick<HttpService, 'post'>>

  const axiosResponse = <T>(data: T): AxiosResponse<T> =>
    ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as never } as AxiosResponse<T>)

  const buildInput = (overrides: Partial<AITransformInput> = {}): AITransformInput => ({
    inputs: [{ name: 'x', type: 'number', value: 1 } as never],
    prompt: 'Transform the inputs',
    provider: 'openai',
    ...overrides,
  })

  beforeEach(async () => {
    httpService = { post: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [BuilderAiService, { provide: HttpService, useValue: httpService }],
    }).compile()

    service = module.get(BuilderAiService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('transformInputsWithAI', () => {
    it('devrait lever une erreur pour un provider non supporté', async () => {
      await expect(service.transformInputsWithAI(buildInput({ provider: 'unknown' as never }), 'key')).rejects.toThrow(
        'Provider non supporté: unknown'
      )
    })
  })

  describe('OpenAI', () => {
    it("devrait appeler l'API OpenAI avec le bon endpoint/headers et parser un tableau JSON", async () => {
      const parsedInputs = [{ name: 'x', type: 'number', value: 42 }]
      httpService.post.mockReturnValue(
        of(
          axiosResponse<OpenAIResponse>({
            choices: [{ message: { content: JSON.stringify(parsedInputs) } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          })
        )
      )

      const result = await service.transformInputsWithAI(buildInput({ provider: 'openai' }), 'sk-test')

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({ model: 'gpt-4o-mini' }),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }) })
      )
      expect(result.inputs).toEqual(parsedInputs)
      expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 })
    })

    it('devrait utiliser le modèle personnalisé si fourni', async () => {
      httpService.post.mockReturnValue(
        of(
          axiosResponse<OpenAIResponse>({
            choices: [{ message: { content: '[]' } }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          })
        )
      )

      await service.transformInputsWithAI(buildInput({ provider: 'openai', model: 'gpt-4o' }), 'sk-test')

      expect(httpService.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ model: 'gpt-4o' }),
        expect.anything()
      )
    })

    it('devrait parser un objet avec propriété inputs', async () => {
      const parsedInputs = [{ name: 'y', type: 'string', value: 'ok' }]
      httpService.post.mockReturnValue(
        of(
          axiosResponse<OpenAIResponse>({
            choices: [{ message: { content: JSON.stringify({ inputs: parsedInputs }) } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          })
        )
      )

      const result = await service.transformInputsWithAI(buildInput({ provider: 'openai' }), 'sk-test')

      expect(result.inputs).toEqual(parsedInputs)
    })

    it("devrait lever une erreur générique si l'appel HTTP échoue", async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('network down')))

      await expect(service.transformInputsWithAI(buildInput({ provider: 'openai' }), 'sk-test')).rejects.toThrow(
        'Erreur lors de la transformation avec OpenAI'
      )
    })

    it('devrait lever une erreur si la réponse ne contient ni tableau ni propriété inputs', async () => {
      httpService.post.mockReturnValue(
        of(
          axiosResponse<OpenAIResponse>({
            choices: [{ message: { content: JSON.stringify({ foo: 'bar' }) } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          })
        )
      )

      await expect(service.transformInputsWithAI(buildInput({ provider: 'openai' }), 'sk-test')).rejects.toThrow(
        'Erreur lors de la transformation avec OpenAI'
      )
    })

    it('devrait lever une erreur si le JSON retourné est invalide', async () => {
      httpService.post.mockReturnValue(
        of(
          axiosResponse<OpenAIResponse>({
            choices: [{ message: { content: 'not-json' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          })
        )
      )

      await expect(service.transformInputsWithAI(buildInput({ provider: 'openai' }), 'sk-test')).rejects.toThrow(
        'Erreur lors de la transformation avec OpenAI'
      )
    })
  })

  describe('Anthropic', () => {
    it("devrait appeler l'API Anthropic avec le bon endpoint/headers et extraire le JSON du texte", async () => {
      const parsedInputs = [{ name: 'x', type: 'number', value: 7 }]
      httpService.post.mockReturnValue(
        of(
          axiosResponse<AnthropicResponse>({
            content: [{ text: `Voici le résultat:\n${JSON.stringify(parsedInputs)}\nFin.` }],
            usage: { input_tokens: 20, output_tokens: 8 },
          })
        )
      )

      const result = await service.transformInputsWithAI(buildInput({ provider: 'anthropic' }), 'anthropic-key')

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({ model: 'claude-3-5-sonnet-20241022' }),
        expect.objectContaining({ headers: expect.objectContaining({ 'x-api-key': 'anthropic-key' }) })
      )
      expect(result.inputs).toEqual(parsedInputs)
      expect(result.usage).toEqual({ promptTokens: 20, completionTokens: 8, totalTokens: 28 })
    })

    it("devrait lever une erreur générique si aucun JSON n'est trouvé dans la réponse", async () => {
      httpService.post.mockReturnValue(
        of(
          axiosResponse<AnthropicResponse>({
            content: [{ text: 'Pas de JSON ici.' }],
            usage: { input_tokens: 1, output_tokens: 1 },
          })
        )
      )

      await expect(service.transformInputsWithAI(buildInput({ provider: 'anthropic' }), 'key')).rejects.toThrow(
        'Erreur lors de la transformation avec Claude'
      )
    })

    it("devrait lever une erreur générique si l'appel HTTP échoue", async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('network down')))

      await expect(service.transformInputsWithAI(buildInput({ provider: 'anthropic' }), 'key')).rejects.toThrow(
        'Erreur lors de la transformation avec Claude'
      )
    })
  })

  describe('Mistral', () => {
    it("devrait appeler l'API Mistral avec le bon endpoint/headers", async () => {
      const parsedInputs = [{ name: 'x', type: 'number', value: 3 }]
      httpService.post.mockReturnValue(
        of(
          axiosResponse<MistralResponse>({
            choices: [{ message: { content: JSON.stringify(parsedInputs) } }],
            usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
          })
        )
      )

      const result = await service.transformInputsWithAI(buildInput({ provider: 'mistral' }), 'mistral-key')

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/chat/completions',
        expect.objectContaining({ model: 'mistral-small-latest' }),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer mistral-key' }) })
      )
      expect(result.inputs).toEqual(parsedInputs)
    })

    it("devrait lever une erreur générique si l'appel HTTP échoue", async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('network down')))

      await expect(service.transformInputsWithAI(buildInput({ provider: 'mistral' }), 'key')).rejects.toThrow(
        'Erreur lors de la transformation avec Mistral'
      )
    })
  })
})
