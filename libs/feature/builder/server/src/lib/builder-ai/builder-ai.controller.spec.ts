import { Test } from '@nestjs/testing'
import { ForbiddenResponse } from '@platon/core/common'
import { AITransformInput } from '@platon/feature/builder/common'
import { BuilderAiController } from './builder-ai.controller'
import { BuilderAiService } from './builder-ai.service'

describe('BuilderAiController', () => {
  let controller: BuilderAiController
  let service: jest.Mocked<Pick<BuilderAiService, 'transformInputsWithAI'>>

  beforeEach(async () => {
    service = { transformInputsWithAI: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [BuilderAiController, { provide: BuilderAiService, useValue: service }],
    }).compile()

    controller = module.get(BuilderAiController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('transformInputs', () => {
    it('devrait toujours lever une ForbiddenResponse (fonctionnalité désactivée)', async () => {
      const input = { inputs: [], prompt: 'x', provider: 'openai' } as AITransformInput

      await expect(controller.transformInputs(input, 'api-key')).rejects.toBeInstanceOf(ForbiddenResponse)
      expect(service.transformInputsWithAI).not.toHaveBeenCalled()
    })

    it('devrait rejeter même sans clé API fournie (le garde-fou ForbiddenResponse est déclenché en premier)', async () => {
      const input = { inputs: [], prompt: 'x', provider: 'openai' } as AITransformInput

      await expect(controller.transformInputs(input, '')).rejects.toBeInstanceOf(ForbiddenResponse)
    })
  })
})
