import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseConfigEditor } from '../../ple-input'
import { InputSelectOptions } from '../input-select'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { UiTagListComponent } from '@platon/shared/ui'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzSelectModule } from 'ng-zorro-antd/select'

@Component({
  selector: 'app-input-select-config-editor',
  templateUrl: 'config-editor.component.html',
  styleUrls: ['config-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzCheckboxModule,
    NzSelectModule,
    NzInputModule,
    UiTagListComponent,
  ],
})
export class ConfigEditorComponent extends BaseConfigEditor<InputSelectOptions> {
  constructor() {
    super()
  }

  override setOptions(options: InputSelectOptions): void {
    super.setOptions?.({
      ...options,
      choices: options.choices || [],
    })
  }

  protected editChoice(index: number, value: string): void {
    this.options.choices?.splice(index, 1, value)
    this.notifyOptionsChange?.(this.options)
  }

  protected removeChoice(index: number): void {
    this.options.choices?.splice(index, 1)
    this.notifyOptionsChange?.(this.options)
  }

  protected addChoice(value: string): void {
    this.options.choices = [...(this.options.choices || []), value]
    this.notifyOptionsChange?.(this.options)
  }

  protected reorderChoices(choices: string[]): void {
    this.options.choices = choices
    this.notifyOptionsChange?.(this.options)
  }
}
