import { Provider } from '@angular/core'
import { ResultProvider } from './models/result-provider'
import { RemoteResultProvider } from './providers/remote-result.provider'
import { SessionCommentProvider } from './models/session-comment-provider'
import { RemoteSessionCommentProvider } from './providers/remote-session-comment.provider'
import { RemoteLabelProvider } from './providers/remote-label.provider'
import { LabelProvider } from './models/label.provider'

export const RESULT_PROVIDERS: Provider[] = [
  { provide: ResultProvider, useClass: RemoteResultProvider },
  { provide: SessionCommentProvider, useClass: RemoteSessionCommentProvider },
  { provide: LabelProvider, useClass: RemoteLabelProvider },
]
