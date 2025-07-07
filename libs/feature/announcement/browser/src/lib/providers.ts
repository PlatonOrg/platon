import { Provider } from '@angular/core'
import { AnnouncementProvider } from './models/announcement-provider'
import { RemoteAnnouncementProvider } from './providers/remote-announcement.provider'


export const ANNOUNCEMENT_PROVIDERS: Provider[] = [{provide : AnnouncementProvider, useClass: RemoteAnnouncementProvider}]
