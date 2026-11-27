import { NgModule } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { PloEditorComponent } from './plo-editor.component'

@NgModule({
  imports: [PloEditorComponent],
  exports: [PloEditorComponent],
  declarations: [],
})
export class PleConfigEditorModule implements IDynamicModule {
  component = PloEditorComponent
}
