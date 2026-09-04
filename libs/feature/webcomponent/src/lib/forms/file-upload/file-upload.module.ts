import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { FileUploadComponent } from './file-upload.component'

@NgModule({
  declarations: [],
  imports: [FileUploadComponent],
  exports: [FileUploadComponent],
})
export class FileUploadModule implements IDynamicModule {
  component: Type<unknown> = FileUploadComponent
}
