import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
  OnInit,
  ViewChild,
  AfterViewInit,
  ElementRef,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { CheckboxGroupComponentDefinition, CheckboxGroupState, CheckboxItem } from './checkbox-group'

@Component({
  selector: 'wc-checkbox-group',
  templateUrl: 'checkbox-group.component.html',
  styleUrls: ['checkbox-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(CheckboxGroupComponentDefinition)
export class CheckboxGroupComponent implements WebComponentHooks<CheckboxGroupState>, OnInit, AfterViewInit {
  @Input() state!: CheckboxGroupState
  @Output() stateChange = new EventEmitter<CheckboxGroupState>()

  @ViewChild('focusZone', { static: true }) focusZone!: ElementRef

  inputMap: Map<string, () => void> = new Map([
    ['Enter', () => this.onCheckBoxEnter()],
    ['ArrowDown', () => (this.state.selectedIndex = Math.min(this.state.selectedIndex + 1, this.state.items.length))],
    ['ArrowUp', () => (this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, -1))],
    ['Tab', () => (this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.items.length)],
  ])

  constructor(readonly injector: Injector) {}

  ngAfterViewInit(): void {
    this.focusZone.nativeElement.addEventListener('keydown', this.onKeydown.bind(this))
  }

  ngOnInit() {
    this.state.isFilled = false
    this.state.selectedIndex = -1
  }

  onChangeState() {
    if (!Array.isArray(this.state.items)) {
      this.state.items = []
    }
    this.state.items.forEach((item, index) => {
      if (typeof item === 'string') {
        item = this.state.items[index] = {
          content: item,
          checked: false,
        }
      }
      if (item.checked == null) {
        item.checked = false
      }
    })
  }

  trackBy(index: number, item: CheckboxItem) {
    return item.content || index
  }

  private onKeydown(event: KeyboardEvent) {
    if (this.inputMap.has(event.key)) {
      this.inputMap.get(event.key)?.()
      event.preventDefault()
    }
  }

  private onCheckBoxEnter() {
    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < this.state.items.length) {
      const item = this.state.items[this.state.selectedIndex]
      item.checked = !item.checked
      this.stateChange.emit(this.state)
    }
  }
}
