import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { CodeEditorComponent } from './code-editor.component'

@NgModule({
  declarations: [],
  imports: [CodeEditorComponent],
  exports: [CodeEditorComponent],
})
export class CodeEditorModule implements IDynamicModule {
  component: Type<unknown> = CodeEditorComponent
}
