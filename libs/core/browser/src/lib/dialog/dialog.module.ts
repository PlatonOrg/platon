import { NzMessageModule } from 'ng-zorro-antd/message'

import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { DialogService } from './dialog.service'
import { PromptDialogComponent } from './prompt/prompt.component'
import { NzNotificationModule } from 'ng-zorro-antd/notification'

@NgModule({
  declarations: [PromptDialogComponent],
  imports: [FormsModule, NzButtonModule, NzModalModule, NzMessageModule, NzNotificationModule],
  exports: [NzModalModule, NzMessageModule],
  providers: [DialogService],
})
export class DialogModule {}
