import { NgModule, Type } from '@angular/core'

import { IDynamicModule } from '@cisstech/nge/services'

import { WordSelectorComponent } from './word-selector.component'

@NgModule({
  declarations: [],
  imports: [WordSelectorComponent],
  exports: [WordSelectorComponent],
})
export class WordSelectorModule implements IDynamicModule {
  component: Type<unknown> = WordSelectorComponent
}
