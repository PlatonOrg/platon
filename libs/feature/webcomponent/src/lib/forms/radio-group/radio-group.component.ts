import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentService } from '../../web-component.service'
import { RadioGroupComponentDefinition, RadioGroupItem, RadioGroupState } from './radio-group'

@Component({
  selector: 'wc-radio-group',
  templateUrl: 'radio-group.component.html',
  styleUrls: ['radio-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(RadioGroupComponentDefinition)
export class RadioGroupComponent implements WebComponentHooks<RadioGroupState>, OnInit, AfterViewInit {
  private readonly webComponentService!: WebComponentService

  @ViewChild('focusZone', { static: true }) focusZone!: ElementRef

  @Input() state!: RadioGroupState
  @Output() stateChange = new EventEmitter<RadioGroupState>()

  inputMap: Map<string, () => void> = new Map([
    [
      'Enter',
      () => {
        this.state.selection = this.state.items[this.state.selectedIndex]?.content || ''
      },
    ],
    [
      'ArrowDown',
      () => {
        this.state.selectedIndex = Math.min(this.state.selectedIndex + 1, this.state.items.length - 1)
      },
    ],
    [
      'ArrowUp',
      () => {
        this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, -1)
      },
    ],
    [
      'Tab',
      () => {
        this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.items.length
      },
    ],
  ])

  constructor(readonly injector: Injector) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.webComponentService = injector.get(WebComponentService)!
  }

  ngOnInit() {
    this.state.isFilled = false
  }

  ngAfterViewInit(): void {
    this.focusZone.nativeElement.addEventListener('keydown', this.onKeydown.bind(this))
  }

  onChangeState() {
    if (!Array.isArray(this.state.items)) {
      this.state.items = []
    }

    this.state.items.forEach((item, index) => {
      if (typeof item === 'string') {
        this.state.items[index] = {
          content: item,
        }
      }
    })
  }

  trackBy(index: number, item: RadioGroupItem) {
    return item.content || index
  }

  protected autoValidate() {
    if (this.state.autoValidation && this.state.selection) {
      this.webComponentService.submit(this)
    }
  }

  protected onClick(event: Event, item: RadioGroupItem, i: number) {
    this.state.selection = item.content
    event.stopPropagation()
    this.autoValidate()
    this.state.isFilled = true
    this.state.selectedIndex = i
  }

  private onKeydown(event: KeyboardEvent) {
    if (this.inputMap.has(event.key)) {
      this.inputMap.get(event.key)?.()
      event.preventDefault()
    }
  }
}
