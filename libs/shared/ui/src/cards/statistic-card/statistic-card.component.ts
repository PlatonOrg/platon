import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  TemplateRef,
  booleanAttribute,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'

export const positiveGreenColor = (value: number) => {
  if (value >= 80) return '#52C41A'
  if (value > 40 && value < 90) return 'var(--brand-text-primary, #090A39D9)'
  if (value == 0) return '#FF1414'
  return '#FAAD14'
}

export const positiveRedColor = (value: number) => {
  if (value >= 80) return '#FAAD14'
  if (value > 40 && value < 90) return 'var(--brand-text-primary, #090A39D9)'
  return '#52C41A'
}

@Component({
  standalone: true,
  selector: 'ui-statistic-card',
  templateUrl: 'statistic-card.component.html',
  styleUrls: ['./statistic-card.component.scss'],
  imports: [CommonModule, MatIconModule, NzIconModule, NzToolTipModule, NzInputNumberModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiStatisticCardComponent implements OnChanges {
  protected isEditing = false

  @Input()
  icon?: TemplateRef<unknown>

  @Input()
  nzIcon?: string

  @Input()
  matIcon?: string

  @Input()
  value!: number | string

  @Input()
  valueSuffix = ''

  @Input()
  valueColor = 'var(--brand-text-primary, #000)'

  @Input()
  tooltip?: string

  @Input()
  description!: string

  @Input()
  ribbonColor = '#3498db'

  @Input({ transform: booleanAttribute })
  shouldBePositive?: boolean

  @Input({ transform: booleanAttribute })
  shouldBeZero?: boolean

  @Input()
  edit = false

  @Output()
  valueChanged = new EventEmitter<number>()

  ngOnChanges() {
    if (this.shouldBePositive) {
      this.valueColor = positiveGreenColor(Number(this.value))
    }

    if (this.shouldBeZero) {
      this.valueColor = positiveRedColor(Number(this.value))
    }
  }

  onCardClick() {
    if (this.edit) {
      this.isEditing = true
      setTimeout(() => {
        const input = document.getElementById('input-edit-value')
        if (input) {
          input.focus()
        }
      }, 0)
    }
  }

  onFocusOut() {
    this.isEditing = false
    this.valueChanged.emit(Number(this.value))
  }

  onKeydown(event: KeyboardEvent) {
    event.stopPropagation()
    event.stopImmediatePropagation()
    if (event.key === 'Enter') {
      this.isEditing = false
      this.valueChanged.emit(Number(this.value))
    } else if (event.key === 'Escape') {
      this.isEditing = false
    }
    this.ngOnChanges()
  }
}
