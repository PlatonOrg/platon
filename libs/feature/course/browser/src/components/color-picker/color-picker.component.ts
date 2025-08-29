import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
  AfterViewInit,
  ElementRef,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NzSliderModule } from 'ng-zorro-antd/slider'
import { ThemeService } from '@platon/core/browser'

@Component({
  standalone: true,
  selector: 'course-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NzSliderModule],
})
export class CourseColorPickerComponent implements OnInit, AfterViewInit {
  private readonly themeService = inject(ThemeService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly elementRef = inject(ElementRef)

  @Input() hue = 210
  @Output() hueChange = new EventEmitter<number>()

  ngOnInit(): void {
    this.themeService.themeChange.subscribe(() => {
      this.cdr.markForCheck()
      this.updateSliderBackground()
    })
  }

  ngAfterViewInit(): void {
    this.updateSliderBackground()
  }

  get isDark(): boolean {
    return this.themeService.isDark
  }

  get themeValues() {
    const isDark = this.isDark
    return {
      saturation: isDark ? 40 : 80,
      lightness: isDark ? 40 : 80,
    }
  }

  get currentColor(): string {
    return this.hueToCSS(this.hue)
  }

  private hueToCSS(hue: number): string {
    const { saturation, lightness } = this.themeValues
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  get hueGradient(): string {
    const { saturation, lightness } = this.themeValues
    return `linear-gradient(to right,
      hsl(0, ${saturation}%, ${lightness}%),
      hsl(60, ${saturation}%, ${lightness}%),
      hsl(120, ${saturation}%, ${lightness}%),
      hsl(180, ${saturation}%, ${lightness}%),
      hsl(240, ${saturation}%, ${lightness}%),
      hsl(300, ${saturation}%, ${lightness}%),
      hsl(360, ${saturation}%, ${lightness}%))`
  }

  onHueChange(value: number): void {
    this.hue = value
    this.hueChange.emit(value)
    this.updateHandleColor()
  }

  private updateSliderBackground(): void {
    const rail = this.elementRef.nativeElement.querySelector('.ant-slider-rail')
    const track = this.elementRef.nativeElement.querySelector('.ant-slider-track')

    if (rail) {
      rail.style.background = this.hueGradient
    }

    if (track) {
      track.style.display = 'none'
    }

    this.updateHandleColor()
  }

  private updateHandleColor(): void {
    const handle = this.elementRef.nativeElement.querySelector('.ant-slider-handle')
    if (handle) {
      const handleColor = this.hueToCSS(this.hue)
      handle.style.backgroundColor = handleColor
      handle.style.borderColor = '#fff'
    }
  }
}
