import { NgModule } from '@angular/core'

import { NzModalModule } from 'ng-zorro-antd/modal'
import { DialogService } from './dialog.service'
import { PromptDialogComponent } from './prompt/prompt.component'
import { NzMessageService } from 'ng-zorro-antd/message'

@NgModule({
  imports: [NzModalModule, PromptDialogComponent],
  exports: [NzModalModule],
  providers: [DialogService, NzMessageService],
})
export class DialogModule {}
