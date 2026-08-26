import { ChangeDetectionStrategy, Component } from '@angular/core'
import { BaseValueEditor } from '../../ple-input'
import { InputListOptions } from '../input-list'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { UiTagListComponent } from '@platon/shared/ui'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'

@Component({
  selector: 'app-input-list-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
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
export class ValueEditorComponent extends BaseValueEditor<string[], InputListOptions> {
  constructor() {
    super()
  }
  override setValue(value: string[]): void {
    super.setValue(value && Array.isArray(value) ? value : [])
  }

  protected editValue(index: number, value: string): void {
    const values = this.value || []
    values[index] = value
    this.notifyValueChange?.(values)
  }

  protected removeValue(index: number): void {
    const values = this.value || []
    values.splice(index, 1)
    this.notifyValueChange?.(values)
  }

  protected addValue(value: string): void {
    const values = this.value || []
    values.push(value)
    this.notifyValueChange?.(values)
  }
}
