import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'

import { EditorJsComponent } from './editorjs.component'
@NgModule({
  imports: [CommonModule, EditorJsComponent],
  exports: [EditorJsComponent],
})
export class UiEditorJsModule {}
