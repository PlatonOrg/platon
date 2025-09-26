import { Provider } from '@angular/core'
import { AiProvider } from './models/ai-provider'
import { RemoteAiProvider } from './providers/remote-ai.provider'

export const AI_PROVIDERS: Provider[] = [{ provide: AiProvider, useClass: RemoteAiProvider }]
