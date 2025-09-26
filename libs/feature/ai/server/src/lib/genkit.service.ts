import openAI from '@genkit-ai/compat-oai/openai'
import googleAI from '@genkit-ai/googleai'
import { Injectable } from '@nestjs/common'
import { Genkit, genkit } from 'genkit'

@Injectable()
export class GenkitService {
  private static instance: Genkit

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): Genkit {
    if (!GenkitService.instance) {
      GenkitService.instance = genkit({
        promptDir: 'libs/feature/ai/server/src/assets/prompts',
        plugins: [
          googleAI({
            apiKey: process.env['GEMINI_API_KEY'],
          }),
          openAI({
            baseURL: process.env['RAGUSTAVE_API_URL'],
            apiKey: process.env['RAGUSTAVE_API_KEY'],
          }),
        ],
      })
    }
    return GenkitService.instance
  }
}
