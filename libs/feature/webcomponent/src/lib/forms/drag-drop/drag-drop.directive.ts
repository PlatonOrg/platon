import { AfterContentInit, Directive, ElementRef, EventEmitter, OnDestroy, Output, Renderer2 } from '@angular/core'

type EventHandler = (event: unknown) => boolean | undefined
export interface DragDropEvent {
  source: string
  destination: string
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[dragNdrop]',
})
export class DragDropDirective implements OnDestroy, AfterContentInit {
  private static NODE_ID = 0
  private readonly events: (() => void)[] = []

  // Support tactile pour mobile
  private touchState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    dragElement: null as HTMLElement | null,
  }

  readonly id: string

  @Output()
  dropped = new EventEmitter<DragDropEvent>()

  constructor(private readonly el: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {
    this.id = 'dnd-' + ++DragDropDirective.NODE_ID
  }

  ngAfterContentInit(): void {
    const node: HTMLElement = this.el.nativeElement
    this.setDraggable(node)
    this.setDroppable(node)
    this.setTouchDraggable(node) // Ajouter le support tactile
  }

  ngOnDestroy(): void {
    this.events.forEach((e) => e())
    this.cleanupTouchDrag() // Nettoyer les éléments tactiles
  }

  private setDraggable(node: HTMLElement) {
    this.renderer.setAttribute(node, 'id', this.id)
    this.renderer.setProperty(node, 'draggable', true)

    // Désactiver les gestes natifs pour éviter les conflits sur mobile
    this.renderer.setStyle(node, 'touch-action', 'none')
    this.renderer.setStyle(node, 'user-select', 'none')
    this.renderer.setStyle(node, '-webkit-user-select', 'none')
    this.renderer.setStyle(node, '-webkit-touch-callout', 'none')

    const dragstart = (e: DragEvent) => {
      if (!e.dataTransfer) return false
      e.dataTransfer.effectAllowed = 'move'

      const x = this.el.nativeElement.offsetWidth / 2
      const y = this.el.nativeElement.offsetHeight / 2
      e.dataTransfer.setDragImage(this.el.nativeElement, x, y)

      e.dataTransfer.setData('dnd-id', node.id)
      this.renderer.addClass(node, 'dnd-drag')
      return false
    }
    node.addEventListener('dragstart', dragstart, false)
    const dragend = () => {
      this.renderer.removeClass(node, 'dnd-drag')
      return false
    }
    node.addEventListener('dragend', dragend, false)
  }

  private setDroppable(node: HTMLElement) {
    const dragover = (e: DragEvent) => {
      if (!e.dataTransfer) return false
      e.dataTransfer.dropEffect = 'move'
      e.preventDefault()
      this.renderer.addClass(node, 'dnd-over')
      return false
    }
    this.addListener(node, 'dragover', dragover as EventHandler)

    const dragenter = () => {
      this.renderer.removeClass(node, 'dnd-over')
      return false
    }
    this.addListener(node, 'dragenter', dragenter)

    const dragleave = () => {
      this.renderer.removeClass(node, 'dnd-over')
      return false
    }
    this.addListener(node, 'dragleave', dragleave)

    const drop = (e: DragEvent) => {
      if (!e.dataTransfer) {
        return false
      }

      e.preventDefault()
      e.stopPropagation()

      this.renderer.removeClass(node, 'dnd-over')

      const dndId = e.dataTransfer.getData('dnd-id')
      if (dndId) {
        this.dropped.emit({
          source: dndId,
          destination: this.id,
        })
      }
      return false
    }
    this.addListener(node, 'drop', drop as EventHandler)
  }

  private addListener(node: HTMLElement, event: string, handler: EventHandler) {
    this.renderer.listen(node, event, handler)
    this.events.push(() => {
      node.removeEventListener(event, handler, false)
    })
  }

  private setTouchDraggable(node: HTMLElement) {
    // Seulement sur les appareils tactiles
    if (!('ontouchstart' in window)) return

    const touchstart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || this.touchState.isDragging) return

      const touch = e.touches[0]
      const rect = node.getBoundingClientRect()

      this.touchState.isDragging = true
      this.touchState.startX = touch.clientX
      this.touchState.startY = touch.clientY
      this.touchState.offsetX = touch.clientX - rect.left
      this.touchState.offsetY = touch.clientY - rect.top

      // Créer l'élément de drag visuel
      this.createTouchDragElement(node)
      this.updateTouchDragPosition(touch.clientX, touch.clientY)

      this.renderer.addClass(node, 'dnd-drag')
      e.preventDefault() // Empêcher le scroll
    }

    const touchmove = (e: TouchEvent) => {
      if (!this.touchState.isDragging || e.touches.length !== 1) return

      e.preventDefault()
      const touch = e.touches[0]
      this.updateTouchDragPosition(touch.clientX, touch.clientY)

      // Mettre à jour les zones de drop
      this.updateDropZoneHighlight(touch.clientX, touch.clientY)
    }

    const touchend = (e: TouchEvent) => {
      if (!this.touchState.isDragging) return

      e.preventDefault()
      const touch = e.changedTouches[0]

      // Trouver l'élément de destination
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
      const dropZone = elementBelow?.closest('[dragNdrop]') as HTMLElement

      if (dropZone && dropZone !== node && dropZone.id) {
        this.dropped.emit({
          source: this.id,
          destination: dropZone.id,
        })
      }

      this.cleanupTouchDrag()
      this.renderer.removeClass(node, 'dnd-drag')
    }

    this.addListener(node, 'touchstart', touchstart as EventHandler)
    // Pour touchmove et touchend, on utilise addEventListener directement sur document
    document.addEventListener('touchmove', touchmove as EventListener, { passive: false })
    document.addEventListener('touchend', touchend as EventListener, { passive: false })

    // Ajouter les unlisteners au cleanup
    this.events.push(() => {
      document.removeEventListener('touchmove', touchmove as EventListener)
      document.removeEventListener('touchend', touchend as EventListener)
    })
  }

  private createTouchDragElement(originalNode: HTMLElement) {
    this.touchState.dragElement = originalNode.cloneNode(true) as HTMLElement
    const dragEl = this.touchState.dragElement

    // Styles pour l'élément de drag
    this.renderer.setStyle(dragEl, 'position', 'fixed')
    this.renderer.setStyle(dragEl, 'pointer-events', 'none')
    this.renderer.setStyle(dragEl, 'z-index', '9999')
    this.renderer.setStyle(dragEl, 'opacity', '0.8')
    this.renderer.setStyle(dragEl, 'transform', 'rotate(3deg) scale(1.05)')
    this.renderer.setStyle(dragEl, 'box-shadow', '0 5px 15px rgba(0,0,0,0.3)')
    this.renderer.setStyle(dragEl, 'border-radius', '8px')

    document.body.appendChild(dragEl)
  }

  private updateTouchDragPosition(clientX: number, clientY: number) {
    if (this.touchState.dragElement) {
      this.renderer.setStyle(this.touchState.dragElement, 'left', `${clientX - this.touchState.offsetX}px`)
      this.renderer.setStyle(this.touchState.dragElement, 'top', `${clientY - this.touchState.offsetY}px`)
    }
  }

  private updateDropZoneHighlight(clientX: number, clientY: number) {
    // Nettoyer tous les highlights
    document.querySelectorAll('.dnd-over').forEach((el) => {
      this.renderer.removeClass(el, 'dnd-over')
    })

    // Ajouter le highlight à la zone actuelle
    const elementBelow = document.elementFromPoint(clientX, clientY)
    const dropZone = elementBelow?.closest('[dragNdrop]')
    if (dropZone && dropZone !== this.el.nativeElement) {
      this.renderer.addClass(dropZone, 'dnd-over')
    }
  }

  private cleanupTouchDrag() {
    if (this.touchState.dragElement) {
      document.body.removeChild(this.touchState.dragElement)
      this.touchState.dragElement = null
    }

    // Nettoyer tous les highlights
    document.querySelectorAll('.dnd-over').forEach((el) => {
      this.renderer.removeClass(el, 'dnd-over')
    })

    this.touchState.isDragging = false
  }
}
