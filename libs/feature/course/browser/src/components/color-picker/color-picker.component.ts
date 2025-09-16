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

type ColorSelection = {
  type: 'hue' | 'preset'
  value: number
}

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
  @Input() activityColors: number[] = []
  @Output() hueChange = new EventEmitter<number>()

  customHue = 210
  selectedColor: ColorSelection = { type: 'hue', value: 210 }

  ngOnInit(): void {
    this.initializeColors()
    this.themeService.themeChange.subscribe(() => {
      this.cdr.markForCheck()
      this.updateSliderBackground()
    })
  }

  ngAfterViewInit(): void {
    this.updateSliderBackground()
  }

  get hasFrequentColors(): boolean {
    return this.frequentColors.length > 0
  }

  get frequentColors(): number[] {
    return this.activityColors.slice(0, 5)
  }

  get currentColor(): string {
    return this.hueToCSS(this.customHue)
  }

  get presetColors(): string[] {
    return [
      'var(--brand-color-primary)',
      'var(--brand-background-darker-10)',
      'var(--brand-background-darker-20)',
      'var(--brand-background-darker-30)',
    ]
  }

  hueToCSS(hue: number): string {
    const isDark = this.themeService.isDark
    const saturation = isDark ? 40 : 80
    const lightness = isDark ? 40 : 80
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  onHueChange(value: number): void {
    this.customHue = value
    this.selectedColor = { type: 'hue', value }
    this.emitSelectedHue()
    this.updateHandleColor()
  }

  onFrequentColorClick(hueValue: number): void {
    this.customHue = hueValue
    this.selectedColor = { type: 'hue', value: hueValue }
    this.emitSelectedHue()
    this.updateHandleColor()
    this.cdr.markForCheck()
  }

  onPresetColorClick(presetIndex: number): void {
    this.selectedColor = { type: 'preset', value: -(presetIndex + 1) }
    this.emitSelectedHue()
    this.cdr.markForCheck()
  }

  onCurrentColorClick(): void {
    this.selectedColor = { type: 'hue', value: this.customHue }
    this.emitSelectedHue()
    this.cdr.markForCheck()
  }

  isPresetColorSelected(presetIndex: number): boolean {
    return this.selectedColor.type === 'preset' && this.selectedColor.value === -(presetIndex + 1)
  }

  isCurrentColorSelected(): boolean {
    return this.selectedColor.type === 'hue' && this.selectedColor.value === this.customHue
  }

  isFrequentColorSelected(hueValue: number): boolean {
    return this.selectedColor.type === 'hue' && this.selectedColor.value === hueValue
  }

  private initializeColors(): void {
    if (this.hue < 0) {
      this.customHue = Math.floor(Math.random() * 360)
      this.selectedColor = { type: 'preset', value: this.hue }
    } else {
      this.customHue = this.hue
      this.selectedColor = { type: 'hue', value: this.customHue }
    }
    this.cdr.markForCheck()
  }

  private emitSelectedHue(): void {
    this.hueChange.emit(this.selectedColor.value)
  }

  private get hueGradient(): string {
    const isDark = this.themeService.isDark
    const saturation = isDark ? 40 : 80
    const lightness = isDark ? 40 : 80
    return `linear-gradient(to right,
      hsl(0, ${saturation}%, ${lightness}%),
      hsl(60, ${saturation}%, ${lightness}%),
      hsl(120, ${saturation}%, ${lightness}%),
      hsl(180, ${saturation}%, ${lightness}%),
      hsl(240, ${saturation}%, ${lightness}%),
      hsl(300, ${saturation}%, ${lightness}%),
      hsl(360, ${saturation}%, ${lightness}%))`
  }

  private updateSliderBackground(): void {
    const rail = this.elementRef.nativeElement.querySelector('.ant-slider-rail')
    const track = this.elementRef.nativeElement.querySelector('.ant-slider-track')

    if (rail) rail.style.background = this.hueGradient
    if (track) track.style.display = 'none'

    this.updateHandleColor()
  }

  private updateHandleColor(): void {
    const handle = this.elementRef.nativeElement.querySelector('.ant-slider-handle')
    if (handle) {
      handle.style.backgroundColor = this.hueToCSS(this.customHue)
      handle.style.borderColor = '#fff'
    }
  }
}
