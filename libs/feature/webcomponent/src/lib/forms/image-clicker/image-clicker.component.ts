import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  Output,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentService } from '../../web-component.service'
import { ImageClickerComponentDefinition, ImageClickerState, ClickDisplayMode, ClickPoint } from './image-clicker'
import { deepCopy } from '@cisstech/nge/utils'

@Component({
  selector: 'wc-image-clicker',
  templateUrl: 'image-clicker.component.html',
  styleUrls: ['image-clicker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(ImageClickerComponentDefinition)
export class ImageClickerComponent implements WebComponentHooks<ImageClickerState>, OnInit, OnDestroy {
  private readonly webComponentService!: WebComponentService

  @Input() state!: ImageClickerState
  @Output() stateChange = new EventEmitter<ImageClickerState>()

  @ViewChild('imageRef', { static: true }) imageRef!: ElementRef<HTMLImageElement>

  private resizeObserver?: ResizeObserver

  get clickPoints(): ClickPoint[] {
    return this.state.clickPoints || []
  }

  constructor(readonly injector: Injector, private cdr: ChangeDetectorRef) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.webComponentService = injector.get(WebComponentService)!
  }

  ngOnInit() {
    const updates: Partial<ImageClickerState> = {}

    if (this.state.isFilled === undefined) {
      updates.isFilled = false
    }
    if (!this.state.clickDisplayMode) {
      updates.clickDisplayMode = 'all-points'
    }
    if (this.state.defaultAllowDeletion === undefined) {
      updates.defaultAllowDeletion = true
    }
    if (!this.state.clickPoints) {
      updates.clickPoints = []
    }
    if (this.state.pointSize === undefined) {
      updates.pointSize = 20
    }
    if (this.state.pointOpacity === undefined) {
      updates.pointOpacity = 1
    }
    if (this.state.autoValidation === undefined) {
      updates.autoValidation = false
    }
    if (this.state.disabled === undefined) {
      updates.disabled = false
    }

    this.updateState(updates)

    setTimeout(() => {
      this.initializeResizeObserver()
    })
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }

  private updateState(updates: Partial<ImageClickerState>) {
    Object.assign(this.state, updates)
    this.stateChange.emit(this.state)
  }

  private initializeResizeObserver() {
    if (!this.imageRef?.nativeElement) {
      return
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.cdr.markForCheck()
    })

    this.resizeObserver.observe(this.imageRef.nativeElement)
  }

  get imageStyles() {
    const styles: { [key: string]: string } = {}

    if (this.state.width) {
      styles['width'] = typeof this.state.width === 'number' ? `${this.state.width}px` : this.state.width
    }

    if (this.state.height) {
      styles['height'] = typeof this.state.height === 'number' ? `${this.state.height}px` : this.state.height
    }

    if (this.state.maxWidth) {
      styles['max-width'] = typeof this.state.maxWidth === 'number' ? `${this.state.maxWidth}px` : this.state.maxWidth
    }

    if (this.state.maxHeight) {
      styles['max-height'] =
        typeof this.state.maxHeight === 'number' ? `${this.state.maxHeight}px` : this.state.maxHeight
    }

    return styles
  }

  getPointStyles(point: ClickPoint): { [key: string]: string } {
    const coordinates = this.getPixelCoordinates(point)
    const size = this.state.pointSize || 20
    const opacity = this.state.pointOpacity ?? 1

    const styles: { [key: string]: string } = {
      left: coordinates.x + 'px',
      top: coordinates.y + 'px',
      width: size + 'px',
      height: size + 'px',
      opacity: opacity.toString(),
    }

    if (this.state.clickDisplayMode === 'numbered-order') {
      const fontSize = Math.max(8, Math.min(16, size * 0.6))
      styles['font-size'] = fontSize + 'px'
      styles['width'] = size + 4 + 'px'
      styles['height'] = size + 4 + 'px'
    }

    return styles
  }

  get displayedPoints(): ClickPoint[] {
    switch (this.state.clickDisplayMode) {
      case 'last-only':
        return this.clickPoints.length > 0 ? [this.clickPoints[this.clickPoints.length - 1]] : []
      case 'last-highlighted':
        return this.clickPoints
      case 'all-points':
      case 'numbered-order':
      case 'deletion-status':
      default:
        return this.clickPoints
    }
  }

  getPixelCoordinates(point: ClickPoint): { x: number; y: number } {
    const imageElement = this.imageRef.nativeElement
    if (!imageElement) {
      return { x: 0, y: 0 }
    }

    const rect = imageElement.getBoundingClientRect()
    const pixelX = (point.x / 1000) * rect.width
    const pixelY = (point.y / 1000) * rect.height

    return { x: pixelX, y: pixelY }
  }

  getNormalizedCoordinates(pixelX: number, pixelY: number): { x: number; y: number } {
    const imageElement = this.imageRef.nativeElement
    const rect = imageElement.getBoundingClientRect()

    const normalizedX = Math.round((pixelX / rect.width) * 1000)
    const normalizedY = Math.round((pixelY / rect.height) * 1000)

    return {
      x: Math.max(0, Math.min(1000, normalizedX)),
      y: Math.max(0, Math.min(1000, normalizedY)),
    }
  }

  isLastPoint(point: ClickPoint): boolean {
    if (this.state.clickDisplayMode !== 'last-highlighted' || this.clickPoints.length === 0) {
      return false
    }

    const maxOrder = Math.max(...this.clickPoints.map((p) => p.order))
    return point.order === maxOrder
  }

  getPointNumber(point: ClickPoint): number {
    return point.order
  }

  protected autoValidate() {
    if (this.state.autoValidation && this.state.isFilled) {
      this.webComponentService.submit(this)
    }
  }

  onImageClick(event: MouseEvent) {
    if (this.state.disabled) {
      return
    }

    const rect = this.imageRef.nativeElement.getBoundingClientRect()
    const pixelX = event.clientX - rect.left
    const pixelY = event.clientY - rect.top
    const normalizedCoords = this.getNormalizedCoordinates(pixelX, pixelY)
    const nextOrder = this.getNextAvailableOrder()

    const newPoint: ClickPoint = {
      x: normalizedCoords.x,
      y: normalizedCoords.y,
      order: nextOrder,
      allowDeletion: this.state.defaultAllowDeletion ?? true,
    }

    const newClickPoints = deepCopy(this.clickPoints)
    newClickPoints.push(newPoint)
    const updates: Partial<ImageClickerState> = {
      clickPoints: newClickPoints,
      isFilled: newClickPoints.length > 0,
    }

    this.updateState(updates)
    this.autoValidate()
    this.cdr.markForCheck()
  }

  onPointRightClick(event: MouseEvent, point: ClickPoint) {
    event.preventDefault()
    event.stopPropagation()

    if (this.state.disabled || point.allowDeletion === false) {
      return
    }

    const index = this.clickPoints.findIndex((p) => p.x === point.x && p.y === point.y && p.order === point.order)
    if (index !== -1) {
      const newPoints = [...this.clickPoints]
      newPoints.splice(index, 1)

      const updates: Partial<ImageClickerState> = {
        clickPoints: newPoints,
        isFilled: newPoints.length > 0,
      }

      this.updateState(updates)
      this.cdr.markForCheck()
    }
  }

  private getNextAvailableOrder(): number {
    if (this.clickPoints.length === 0) {
      return 1
    }

    const existingOrders = this.clickPoints.map((point) => point.order).sort((a, b) => a - b)

    for (let i = 1; i <= existingOrders.length + 1; i++) {
      if (!existingOrders.includes(i)) {
        return i
      }
    }

    return existingOrders.length + 1
  }

  getPointClass(point: ClickPoint): string {
    const baseClass = 'click-point'

    if (this.state.clickDisplayMode === 'deletion-status') {
      return point.allowDeletion !== false ? `${baseClass} deletable-point` : `${baseClass} non-deletable-point`
    } else if (this.isLastPoint(point)) {
      return `${baseClass} last-point`
    } else {
      return baseClass
    }
  }
}
