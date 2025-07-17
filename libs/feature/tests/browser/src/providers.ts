import { Provider } from '@angular/core'
import { TestsCandidatesProvider } from './models/tests-candidates.provider'
import { RemoteTestsCandidatesProvider } from './providers/remote-tests-candidates.provider'
import { TestProvider } from './models/test.provider'
import { RemoteTestProvider } from './providers/remote-test.provider'

export const TESTS_PROVIDERS: Provider[] = [
  { provide: TestProvider, useClass: RemoteTestProvider },
  { provide: TestsCandidatesProvider, useClass: RemoteTestsCandidatesProvider },
]
