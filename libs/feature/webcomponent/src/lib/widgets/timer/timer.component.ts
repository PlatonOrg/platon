import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  Output,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { TimerComponentDefinition, TimerState } from './timer'
import { WebComponentService } from '../../web-component.service'

@Component({
  selector: 'wc-timer',
  templateUrl: 'timer.component.html',
  styleUrls: ['timer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(TimerComponentDefinition)
export class TimerComponent implements AfterViewInit, OnDestroy, WebComponentHooks<TimerState> {
  private readonly webComponentService!: WebComponentService
  private readonly cdr: ChangeDetectorRef

  @Input() state!: TimerState
  @Output() stateChange = new EventEmitter<TimerState>()

  private intervalId: NodeJS.Timeout | null = null

  constructor(readonly injector: Injector, cdr: ChangeDetectorRef) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.webComponentService = injector.get(WebComponentService)!
    this.cdr = cdr
  }

  ngAfterViewInit(): void {
    this.onRender()
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  private onRender() {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        if (!this.state.disabled && this.state.countDownTime > 0) {
          this.state.countDownTime--
          if (this.state.countDownTime <= 0) {
            this.webComponentService.submit(this)
            this.state.countDownTime = 0
            this.ngOnDestroy()
          }
          this.stateChange.emit(this.state)
          this.cdr.markForCheck()
        }
      }, 1000)
    }
  }

  get timerClasses(): string {
    let classes = `wc-timer wc-timer--${this.state.alignment}`
    if (this.state.countDownTime > 0) {
      if (this.state.countDownTime > 30) {
        classes += ' pulse'
      } else if (this.state.countDownTime > 10) {
        classes += ' pulse-urgent'
      } else {
        classes += ' critical'
      }
    }
    return classes
  }
}
