import { NgModule } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { PlcEditorComponent } from './plc-editor.component'

@NgModule({
  imports: [PlcEditorComponent],
  exports: [PlcEditorComponent],
  declarations: [],
})
export class PleConfigEditorModule implements IDynamicModule {
  component = PlcEditorComponent
}
