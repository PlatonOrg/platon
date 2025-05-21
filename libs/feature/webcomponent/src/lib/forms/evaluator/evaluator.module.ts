import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'

import { BaseModule } from '../../shared/components/base/base.module'

import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { EvaluatorComponent } from './evaluator.component'

import { NzRateModule } from 'ng-zorro-antd/rate'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'

@NgModule({
  declarations: [EvaluatorComponent],
  imports: [BaseModule, CssPipeModule, NzIconModule, NzRateModule, FormsModule, MatCardModule],
  exports: [EvaluatorComponent],
})
export class EvaluatorModule implements IDynamicModule {
  component: Type<unknown> = EvaluatorComponent
}
