import { NgModule, Type } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'

import { IDynamicModule } from '@cisstech/nge/services'

import { BaseModule } from '../../shared/components/base/base.module'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { FileUploadComponent } from './file-upload.component'

@NgModule({
  declarations: [FileUploadComponent],
  imports: [
    BaseModule,
    CssPipeModule,

    FormsModule,
    ReactiveFormsModule,

    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  exports: [FileUploadComponent],
})
export class FileUploadModule implements IDynamicModule {
  component: Type<unknown> = FileUploadComponent
}
