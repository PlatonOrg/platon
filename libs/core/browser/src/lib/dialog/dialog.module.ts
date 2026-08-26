import { NzMessageModule } from 'ng-zorro-antd/message'

import { NgModule } from '@angular/core'

import { NzModalModule } from 'ng-zorro-antd/modal'
import { DialogService } from './dialog.service'
import { PromptDialogComponent } from './prompt/prompt.component'

@NgModule({
  imports: [NzModalModule, PromptDialogComponent],
  exports: [NzModalModule, NzMessageModule],
  providers: [DialogService],
})
export class DialogModule {}
