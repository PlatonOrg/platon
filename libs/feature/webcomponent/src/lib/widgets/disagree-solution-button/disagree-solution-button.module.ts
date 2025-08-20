import { NgModule, Type } from '@angular/core'
import { HttpClientModule } from '@angular/common/http'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

import { IDynamicModule } from '@cisstech/nge/services'
import { BaseModule } from '../../shared/components/base/base.module'
import { DisagreeSolutionButtonComponent } from './disagree-solution-button.component'

@NgModule({
  declarations: [DisagreeSolutionButtonComponent],
  imports: [BaseModule, HttpClientModule, MatButtonModule, MatIconModule],
  exports: [DisagreeSolutionButtonComponent],
})
export class DisagreeSolutionButtonModule implements IDynamicModule {
  component: Type<unknown> = DisagreeSolutionButtonComponent
}