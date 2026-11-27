import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'
import { ConfettiComponent } from './confetti.component'

@NgModule({
  declarations: [],
  imports: [ConfettiComponent],
  exports: [ConfettiComponent],
})
export class ConfettiModule implements IDynamicModule {
  component: Type<unknown> = ConfettiComponent
}
