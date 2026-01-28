import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { AITransformInput, AITransformOutput } from '@platon/feature/builder/common'
import { PleInput } from '@platon/feature/compiler'
import { AnthropicResponse, MistralResponse, OpenAIResponse } from './builder-ai.models'

@Injectable()
export class BuilderAiService {
  private readonly logger = new Logger(BuilderAiService.name)

  constructor(private readonly httpService: HttpService) {}

  async transformInputsWithAI(input: AITransformInput, apiKey: string): Promise<AITransformOutput> {
    //this.logger.log(`Transformation AI demandée avec ${input.provider}`)

    switch (input.provider) {
      case 'openai':
        return this.transformWithOpenAI(input, apiKey)
      case 'anthropic':
        return this.transformWithAnthropic(input, apiKey)
      case 'mistral':
        return this.transformWithMistral(input, apiKey)
      default:
        throw new Error(`Provider non supporté: ${input.provider}`)
    }
  }

  private async transformWithOpenAI(input: AITransformInput, apiKey: string): Promise<AITransformOutput> {
    const systemPrompt = this.getSystemPrompt()
    const userPrompt = this.getUserPrompt(input.inputs, input.prompt)

    const body = {
      model: input.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<OpenAIResponse>('https://api.openai.com/v1/chat/completions', body, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
      )

      const content = response.data.choices[0].message.content
      const parsedInputs = this.parseAIResponse(content)

      return {
        inputs: parsedInputs,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      }
    } catch (error) {
      this.logger.error("Erreur lors de l'appel à OpenAI:", error)
      throw new Error('Erreur lors de la transformation avec OpenAI')
    }
  }

  private async transformWithAnthropic(input: AITransformInput, apiKey: string): Promise<AITransformOutput> {
    const systemPrompt = this.getSystemPrompt()
    const userPrompt = this.getUserPrompt(input.inputs, input.prompt)

    const body = {
      model: input.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<AnthropicResponse>('https://api.anthropic.com/v1/messages', body, {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        })
      )

      const content = response.data.content[0].text
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)

      if (!jsonMatch) {
        throw new Error('Pas de JSON trouvé dans la réponse Claude')
      }

      const parsedInputs = this.parseAIResponse(jsonMatch[0])

      return {
        inputs: parsedInputs,
        usage: {
          promptTokens: response.data.usage.input_tokens,
          completionTokens: response.data.usage.output_tokens,
          totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens,
        },
      }
    } catch (error) {
      this.logger.error("Erreur lors de l'appel à Anthropic:", error)
      throw new Error('Erreur lors de la transformation avec Claude')
    }
  }

  private async transformWithMistral(input: AITransformInput, apiKey: string): Promise<AITransformOutput> {
    const systemPrompt = this.getSystemPrompt()
    const userPrompt = this.getUserPrompt(input.inputs, input.prompt)

    const body = {
      model: input.model || 'mistral-small-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<MistralResponse>('https://api.mistral.ai/v1/chat/completions', body, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
      )

      const content = response.data.choices[0].message.content
      const parsedInputs = this.parseAIResponse(content)

      return {
        inputs: parsedInputs,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      }
    } catch (error) {
      this.logger.error("Erreur lors de l'appel à Mistral:", error)
      throw new Error('Erreur lors de la transformation avec Mistral')
    }
  }

  private getSystemPrompt(): string {
    return `Tu es un assistant qui transforme des configurations JSON.
Tu reçois un tableau d'objets "inputs" avec des propriétés comme name, type, value, etc.
Tu dois retourner UNIQUEMENT un JSON valide avec le même format, en modifiant les valeurs selon le prompt de l'utilisateur.
Ne retourne RIEN d'autre que le JSON, pas d'explication, pas de markdown.
Le JSON doit être soit un tableau directement, soit un objet avec une propriété "inputs" contenant le tableau.`
  }

  private getUserPrompt(inputs: PleInput[], prompt: string): string {
    return `Voici les inputs actuels :
${JSON.stringify(inputs, null, 2)}

Instruction de transformation :
${prompt}

Retourne le JSON transformé avec exactement la même structure.`
  }

  private parseAIResponse(content: string): PleInput[] {
    try {
      const parsed = JSON.parse(content)

      // Si le modèle retourne directement un tableau
      if (Array.isArray(parsed)) {
        return parsed
      }

      // Si le modèle retourne un objet avec une propriété inputs
      if (parsed.inputs && Array.isArray(parsed.inputs)) {
        return parsed.inputs
      }

      throw new Error('Format de réponse invalide: ni tableau ni objet avec propriété inputs')
    } catch (error) {
      this.logger.error('Erreur de parsing de la réponse IA:', error)
      throw new Error('Format de réponse IA invalide')
    }
  }
}
