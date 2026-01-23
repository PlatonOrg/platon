import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AITransformInput, AITransformOutput } from '@platon/feature/builder/common'
import { BuilderAiService } from './builder-ai.service'
import { ForbiddenResponse } from '@platon/core/common'

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
    throw new ForbiddenResponse('Fonctionnalité AI désactivée pour le moment')
    // if (!apiKey) {
    //   throw new UnauthorizedException('Clé API manquante')
    // }

    // return this.builderAiService.transformInputsWithAI(input, apiKey)
  }
}
