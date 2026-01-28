import { Provider } from '@angular/core'
import { BuilderAiProvider } from './lib/models/builder-ai.provider'
import { RemoteBuilderAiProvider } from './lib/providers/remote-builder-ai.provider'

export const BUILDER_PROVIDERS: Provider[] = [{ provide: BuilderAiProvider, useClass: RemoteBuilderAiProvider }]
