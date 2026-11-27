import { NgModule, Type } from '@angular/core'
import { IDynamicModule } from '@cisstech/nge/services'
import { MarkdownComponent } from './markdown.component'

@NgModule({
  declarations: [],
  imports: [MarkdownComponent],
  exports: [MarkdownComponent],
})
export class MarkdownModule implements IDynamicModule {
  component: Type<unknown> = MarkdownComponent
}
