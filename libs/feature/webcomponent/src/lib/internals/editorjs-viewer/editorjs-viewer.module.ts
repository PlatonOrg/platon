import { CommonModule } from '@angular/common'
import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'
import { EditorjsViewerComponent } from './editorjs-viewer.component'
import { EditorjsViewerService } from '@platon/shared/utils'

@NgModule({
  imports: [CommonModule],
  declarations: [EditorjsViewerComponent],
  exports: [EditorjsViewerComponent],
  providers: [EditorjsViewerService],
})
export class EditorjsViewerModule implements IDynamicModule {
  component: Type<unknown> = EditorjsViewerComponent
}
