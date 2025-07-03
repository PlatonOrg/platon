import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'

import { EditorJsComponent } from './editorjs.component'
@NgModule({
  imports: [CommonModule],
  exports: [EditorJsComponent],
  declarations: [EditorJsComponent],
})
export class UiEditorJsModule {}
