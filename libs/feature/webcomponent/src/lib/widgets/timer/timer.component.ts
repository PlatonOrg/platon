import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { TimerComponentDefinition, TimerState } from './timer'
import { WebComponentService } from '../../web-component.service'

@Component({
  selector: 'wc-timer',
  templateUrl: 'timer.component.html',
  styleUrls: ['timer.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
@WebComponent(TimerComponentDefinition)
export class TimerComponent implements OnInit, OnDestroy, WebComponentHooks<TimerState> {
  private readonly webComponentService!: WebComponentService
  @Input() state!: TimerState
  @Output() stateChange = new EventEmitter<TimerState>()
  private startTime = 0
  private elapsedTime = 0
  private endTime = 0
  private currentAlignment = ''
  formattedTime = ''
  errorFlag = false
  errorMessage = ''

  private intervalId: NodeJS.Timeout | null = null

  constructor(readonly injector: Injector) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.webComponentService = injector.get(WebComponentService)!
  }

  ngOnInit() {
    const style = document.getElementsByClassName('wc-timer')
    for (let i = 0; i < style.length; i++) {
      const element = style[i] as HTMLElement
      console.error('element', element)
      console.error('state', this.state)
      console.error('tout :', `wc-timer--${this.state.alignment}`)
      element.classList.add(`wc-timer--${this.state.alignment}`)
      this.currentAlignment = this.state.alignment
    }
    switch (this.state.mode) {
      case 'chronometer':
        this.runChronometer()
        break
      case 'countdown':
        this.runCountdown()
        break
      default:
        this.errorFlag = true
        this.errorMessage = "Ce mode de timer n'existe pas, veuillez choisir entre `chronometer` ou `countdown`."
        break
    }
  }

  onChangeState(): void {
    if (this.state.alignment !== this.currentAlignment) {
      const style = document.getElementsByClassName('wc-timer')
      for (let i = 0; i < style.length; i++) {
        const element = style[i] as HTMLElement
        element.classList.remove(`wc-timer--${this.currentAlignment}`)
        element.classList.add(`wc-timer--${this.state.alignment}`)
        this.currentAlignment = this.state.alignment
      }
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  runChronometer() {
    this.startTime = Date.now()
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    this.intervalId = setInterval(() => {
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000)
      const minutes = Math.floor(this.elapsedTime / 60)
      const seconds = this.elapsedTime % 60
      this.formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }, 1000)
  }
  runCountdown() {
    if (!this.state.countDownTime) {
      this.errorFlag = true
      this.errorMessage = 'Le temps du compte à rebours doit être défini.'
      return
    }

    this.endTime = Date.now() + this.state.countDownTime * 1000
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    this.intervalId = setInterval(() => {
      const remainingTime = Math.floor((this.endTime - Date.now()) / 1000)
      if (remainingTime <= 0) {
        if (this.intervalId) {
          clearInterval(this.intervalId)
        }
        this.formattedTime = '00:00'
        this.webComponentService.submit(this)
      } else {
        const minutes = Math.floor(remainingTime / 60)
        const seconds = remainingTime % 60
        this.formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      }
    }, 1000)
  }
}
