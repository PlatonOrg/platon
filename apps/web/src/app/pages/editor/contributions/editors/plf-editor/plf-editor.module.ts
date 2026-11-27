import { NgModule } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'
import { PlfEditorComponent } from './plf-editor.component'

@NgModule({
  imports: [PlfEditorComponent],
  exports: [PlfEditorComponent],
  declarations: [],
})
export class PlfEditorModule implements IDynamicModule {
  component = PlfEditorComponent
}
