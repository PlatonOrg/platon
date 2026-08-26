import { NgModule } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { ZipEditorComponent } from './zip-editor.component'

@NgModule({
  imports: [ZipEditorComponent],
  exports: [ZipEditorComponent],
  declarations: [],
})
export class ZipEditorModule implements IDynamicModule {
  component = ZipEditorComponent
}
