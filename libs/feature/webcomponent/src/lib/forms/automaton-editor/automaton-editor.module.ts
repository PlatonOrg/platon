import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { AutomatonEditorComponent } from './automaton-editor.component'

@NgModule({
  declarations: [],
  imports: [AutomatonEditorComponent],
  exports: [AutomatonEditorComponent],
})
export class AutomatonEditorModule implements IDynamicModule {
  component: Type<unknown> = AutomatonEditorComponent
}
