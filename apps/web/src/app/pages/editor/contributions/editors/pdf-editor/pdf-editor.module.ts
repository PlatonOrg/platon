import { NgModule } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { PdfEditorComponent } from './pdf-editor.component'

@NgModule({
  imports: [PdfEditorComponent],
  exports: [PdfEditorComponent],
  declarations: [],
})
export class PdfEditorModule implements IDynamicModule {
  component = PdfEditorComponent
}
