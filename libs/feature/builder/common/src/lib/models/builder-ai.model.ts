import { PleInput } from '@platon/feature/compiler'


export interface AITransformInput {
  inputs: PleInput[]
  prompt: string
  provider: 'openai' | 'anthropic' | 'mistral'
  model?: string
}

export interface AITransformOutput {
  inputs: PleInput[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIProviderConfig {
  apiKey: string
  model?: string
}