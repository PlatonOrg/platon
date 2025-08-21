import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'
import { MathfieldElement } from 'mathlive'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import { MathLiveComponentDefinition, MathLiveState } from './math-live'
import { ComputeEngine } from '@cortex-js/compute-engine'

@Component({
  selector: 'wc-math-live',
  templateUrl: 'math-live.component.html',
  styleUrls: ['math-live.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(MathLiveComponentDefinition)
export class MathLiveComponent implements OnInit, WebComponentHooks<MathLiveState> {
  private mathfield!: MathfieldElement

  @Input() state!: MathLiveState
  @Output() stateChange = new EventEmitter<MathLiveState>()

  @ViewChild('container', { static: true })
  container!: ElementRef<HTMLElement>
  @ViewChild('box', { static: true })
  box!: ElementRef<HTMLElement>

  displayMenu = true
  computeEngine = new ComputeEngine()

  constructor(readonly injector: Injector, readonly changeDetection: WebComponentChangeDetectorService) {}

  async ngOnInit() {
    this.state.isFilled = false
    this.mathfield = new MathfieldElement()
    this.mathfield.value = this.state.value
    this.mathfield.smartFence = false
    this.mathfield.smartSuperscript = true
    this.mathfield.mathVirtualKeyboardPolicy = 'sandboxed'
    MathfieldElement.fontsDirectory = 'assets/vendors/mathlive/fonts'
    this.mathfield.oninput = () => {
      this.changeDetection
        .ignore(this, () => {
          this.state.value = this.computeEngine.parse(this.mathfield.getValue('latex-expanded')).latex
          this.state.isFilled = true
        })
        .catch(console.error)
    }
    this.container.nativeElement.replaceWith(this.mathfield)

    window.addEventListener('click', () => {
      // hide the virtual keyboard when clicking outside the mathfield
      if (
        window.mathVirtualKeyboard &&
        window.mathVirtualKeyboard.visible &&
        !this.mathfield.contains(document.activeElement) &&
        !this.box.nativeElement.contains(document.activeElement)
      ) {
        window.mathVirtualKeyboard.hide()
      }
    })
  }

  onChangeState() {
    this.mathfield.disabled = this.state.disabled
    if (this.state.config) {
      Object.keys(this.state.config).forEach((key) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prettier/prettier
        (this.mathfield as any)[key] = this.state.config[key]
      })
    }
    if (this.mathfield.menuItems?.length == 0) {
      this.box.nativeElement.classList.add('no-menu')
    } else {
      this.box.nativeElement.classList.remove('no-menu')
    }
    if (!this.state.layouts) {
      this.state.layouts = 'default'
    }
    this.mathfield.value = this.state.value
    window.mathVirtualKeyboard.layouts = this.state.layouts
  }
}
