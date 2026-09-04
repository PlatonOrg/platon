import { NgModule } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { PlaExerciseEditorComponent } from './exercise-editor/exercise-editor.component'
import { PlaEditorComponent } from './pla-editor.component'

@NgModule({
  imports: [PlaEditorComponent, PlaExerciseEditorComponent],
  exports: [PlaEditorComponent],
  declarations: [],
})
export class PlfEditorModule implements IDynamicModule {
  component = PlaEditorComponent
}
