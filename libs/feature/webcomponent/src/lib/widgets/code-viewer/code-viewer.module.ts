import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { CodeViewerComponent } from './code-viewer.component'

@NgModule({
  declarations: [],
  imports: [CodeViewerComponent],
  exports: [CodeViewerComponent],
})
export class CodeViewerModule implements IDynamicModule {
  component: Type<unknown> = CodeViewerComponent
}
