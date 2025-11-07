import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AITransformInput, AITransformOutput } from '@platon/feature/builder/common'
import { BuilderAiService } from './builder-ai.service'

@Controller('builder')
@ApiTags('Builder')
@ApiBearerAuth()
export class BuilderAiController {
  constructor(private readonly builderAiService: BuilderAiService) {}

  @Post('transform')
  async transformInputs(
    @Body() input: AITransformInput,
    @Headers('x-ai-api-key') apiKey: string
  ): Promise<AITransformOutput> {
    if (!apiKey) {
      throw new UnauthorizedException('Clé API manquante')
    }

    return this.builderAiService.transformInputsWithAI(input, apiKey)
  }
}