import { NgModule, Type } from '@angular/core'
import { NgeMonacoModule } from '@cisstech/nge/monaco'
import { BaseModule } from '../../shared/components/base/base.module'
import { IDynamicModule } from '@cisstech/nge/services'
import { NgxEchartsModule } from 'ngx-echarts'
import { ConfettiComponent } from './confetti.component'

@NgModule({
  declarations: [ConfettiComponent],
  imports: [BaseModule, NgeMonacoModule, NgxEchartsModule],
  exports: [ConfettiComponent],
})
export class ConfettiModule implements IDynamicModule {
  component: Type<unknown> = ConfettiComponent
}
