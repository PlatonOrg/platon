import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'
import { PresenterComponent } from './presenter.component'

@NgModule({
  declarations: [],
  imports: [PresenterComponent],
  exports: [PresenterComponent],
})
export class PresenterModule implements IDynamicModule {
  component: Type<unknown> = PresenterComponent
}
