import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { MatrixResizerComponent } from './matrix-resizer/matrix-resizer.component'
import { MatrixComponent } from './matrix.component'

@NgModule({
  declarations: [],
  imports: [MatrixComponent, MatrixResizerComponent],
  exports: [MatrixComponent],
})
export class MatrixModule implements IDynamicModule {
  component: Type<unknown> = MatrixComponent
}
