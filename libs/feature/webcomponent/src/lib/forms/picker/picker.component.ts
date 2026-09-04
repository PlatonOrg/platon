import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
  OnInit,
  inject,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { PickerComponentDefinition, type PickerState } from './picker'
import { FormsModule } from '@angular/forms'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { BaseModule } from '../../shared/components/base/base.module'
import { IconGrPipeModule } from '@cisstech/nge/pipes'

@Component({
  selector: 'wc-picker',
  templateUrl: 'picker.component.html',
  styleUrls: ['picker.component.scss'],
  host: {
    '[style.display]': `state.width === 'auto' || state.appearance === 'inline' ? 'inline-flex' : ''`,
    '[style.width]': `state.width !== 'auto' ? (state.width ? state.width : '') : ''`,
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, FormsModule, IconGrPipeModule, MatSelectModule, MatFormFieldModule],
})
@WebComponent(PickerComponentDefinition)
export class PickerComponent implements WebComponentHooks<PickerState>, OnInit {
  readonly injector = inject(Injector)

  @Input() state!: PickerState
  @Output() stateChange = new EventEmitter<PickerState>()

  ngOnInit() {
    this.state.isFilled = false
  }
}
