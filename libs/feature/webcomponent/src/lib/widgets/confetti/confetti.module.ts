import { NgModule, Type } from '@angular/core'
import { BaseModule } from '../../shared/components/base/base.module'
import { IDynamicModule } from '@cisstech/nge/services'
import { ConfettiComponent } from './confetti.component'

@NgModule({
  declarations: [ConfettiComponent],
  imports: [BaseModule],
  exports: [ConfettiComponent],
})
export class ConfettiModule implements IDynamicModule {
  component: Type<unknown> = ConfettiComponent
}
