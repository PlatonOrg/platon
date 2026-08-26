import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { BaseComponent } from './base.component'

@NgModule({
  imports: [BaseComponent, CommonModule],
  exports: [BaseComponent, CommonModule],
  declarations: [],
})
export class BaseModule {}
