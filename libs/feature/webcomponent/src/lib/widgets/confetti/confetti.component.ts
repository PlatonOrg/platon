import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injector,
  Input,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { ConfettiComponentDefinition, ConfettiState } from './confetti'
import confetti from 'canvas-confetti'
@Component({
  selector: 'wc-confetti',
  templateUrl: './confetti.component.html',
  styleUrls: ['confetti.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(ConfettiComponentDefinition)
export class ConfettiComponent implements WebComponentHooks<ConfettiState>, OnInit {
  readonly injector = inject(Injector)
  readonly changeDetectorRef = inject(ChangeDetectorRef)

  @ViewChild('confettiCanvas', { static: false }) confettiCanvas?: ElementRef<HTMLCanvasElement>

  @Input() state!: ConfettiState
  private previousTriggerState = false

  private readonly duration: number = 3 * 1000 // 3 seconds

  private modMap = new Map<string, () => void>([
    ['pride', () => this.pride(this.state.colors)],
    ['fireworks', () => this.fireworks()],
    ['canon', () => this.fireConfettiCannon(this.state.colors)],
    ['snowfall', () => this.snowfall(this.state.colors)],
  ])

  ngOnInit(): void {
    // inject default values if not provided
    if (!this.state.colors || !Array.isArray(this.state.colors) || this.state.colors.length === 0) {
      this.state.colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
    }
    if (!this.state.mode) {
      this.state.mode = 'canon'
    }
  }
  onChangeState() {
    if (this.state) {
      // Check if trigger changed from false to true
      if (this.state.trigger && !this.previousTriggerState) {
        this.launchConfetti()
      }
      this.previousTriggerState = !!this.state.trigger
    }
  }

  private launchConfetti(): void {
    this.modMap.get(this.state.mode)?.()
  }

  private fireConfettiCannon(colors: string[]): void {
    const safeColors = colors.map((color) => String(color))
    for (let i = 0; i < 3; i++) {
      // Create intense confetti explosion
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: safeColors,
        disableForReducedMotion: true,
      })?.catch(console.error)

      // Add some delayed bursts for extra effect
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 70,
          origin: { x: 0 },
          colors: safeColors,
        })?.catch(console.error)
      }, 250)

      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 70,
          origin: { x: 1 },
          colors: safeColors,
        })?.catch(console.error)
      }, 400)
    }
  }

  private fireworks(): void {
    const duration = this.duration
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }
    const safeColors = this.state.colors.map((color) => String(color))

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: ConfettiComponent.randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: safeColors,
      })?.catch(console.error)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: ConfettiComponent.randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: safeColors,
      })?.catch(console.error)
    }, 250)
  }

  private pride(colors: string[]): void {
    const end = Date.now() + this.duration
    const safeColors = colors.map((color) => String(color))

    const frame = () => {
      confetti({
        particleCount: safeColors.length, // Augmenté de 2 à 5
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: safeColors,
      })?.catch((error) => console.error('Confetti error:', error))

      confetti({
        particleCount: safeColors.length, // Augmenté de 2 à 5
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: safeColors,
      })?.catch((error) => console.error('Confetti error:', error))

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  private snowfall(colors: string[]): void {
    const duration = this.duration
    const animationEnd = Date.now() + duration
    const safeColors = colors.map((color) => String(color))
    let skew = 1

    const frame = () => {
      const timeLeft = animationEnd - Date.now()
      const ticks = Math.max(200, 500 * (timeLeft / duration))
      skew = Math.max(0.8, skew - 0.001)

      confetti({
        particleCount: safeColors.length,
        startVelocity: 0,
        ticks: ticks,
        origin: {
          x: Math.random(),
          // since particles fall down, skew start toward the top
          y: Math.random() * skew - 0.2,
        },
        colors: safeColors,
        shapes: ['circle'],
        gravity: ConfettiComponent.randomInRange(0.4, 0.6),
        scalar: ConfettiComponent.randomInRange(0.4, 1),
        drift: ConfettiComponent.randomInRange(-0.4, 0.4),
      })?.catch(console.error)

      if (timeLeft > 0) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  private static randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }
}
