import { NgModule } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { PleEditorComponent } from './ple-editor.component'

@NgModule({
  imports: [PleEditorComponent],
  exports: [PleEditorComponent],
  declarations: [],
})
export class PlfEditorModule implements IDynamicModule {
  component = PleEditorComponent
}
