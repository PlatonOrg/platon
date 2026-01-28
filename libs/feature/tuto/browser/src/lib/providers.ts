import { Provider } from '@angular/core'
import { NzModalService } from 'ng-zorro-antd/modal'
import { NzMessageService } from 'ng-zorro-antd/message'
import { NzNotificationService } from 'ng-zorro-antd/notification'

export const TUTO_PROVIDERS: Provider[] = [NzModalService, NzMessageService, NzNotificationService]
