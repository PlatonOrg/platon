import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzListModule } from 'ng-zorro-antd/list'

import { PleInputEditorModule } from '../ple-input-editor/ple-input.module'
import { PleConfigEditorComponent } from './ple-config-editor.component'

@NgModule({
  imports: [CommonModule, NzListModule, NzButtonModule, PleInputEditorModule],
  exports: [PleConfigEditorComponent],
  declarations: [PleConfigEditorComponent],
})
export class PleConfigEditorModule implements IDynamicModule {
  component = PleConfigEditorComponent
}
