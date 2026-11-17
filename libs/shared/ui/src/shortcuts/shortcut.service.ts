import { DOCUMENT } from '@angular/common'
import { Injectable, NgZone, OnDestroy, inject } from '@angular/core'
import {
  UI_SHORTCUT_MODAL_SELECTOR,
  UI_SHORTCUT_SURFACE_SELECTOR,
  UiShortcutKind,
  isActionable,
  isShown,
  shortcutKindOf,
} from './shortcut.utils'

/** A button that answers to a keyboard shortcut. */
export interface UiShortcutAction {
  readonly element: HTMLElement
  readonly kind: () => UiShortcutKind | null | undefined
}

/**
 * Runs the main action of the surface that has the focus, from the keyboard.
 *
 * - Mod+Enter runs the `submit` action of the nearest surface; a surface with no `submit` action
 *   runs its `save` action instead (tolerant rule).
 * - Mod+S runs the `save` action of the nearest surface.
 *
 * The search starts at the surface that holds the focus and goes up to the page, without leaving an
 * open dialog. It stops at the first surface that has a candidate: a single shown action runs, two
 * or more do nothing, a disabled one does nothing. When no surface on the way has a candidate, a
 * single shown action anywhere on the page runs. Mod+S never opens the "save page" dialog of the
 * browser on a screen that has a `save` action.
 *
 * See `docs/raccourcis-clavier.md`.
 */
@Injectable({ providedIn: 'root' })
export class UiShortcutService implements OnDestroy {
  private readonly document = inject(DOCUMENT)
  private readonly zone = inject(NgZone)
  private readonly actions = new Set<UiShortcutAction>()
  private listening = false

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing) return
    const kind = shortcutKindOf(event)
    if (!kind) return

    const target = kind === 'submit' ? this.find(['submit', 'save']) : this.find(['save'])
    if (!target) {
      if (kind === 'save' && this.shown('save').length) event.preventDefault()
      return
    }

    event.preventDefault()
    if (event.repeat || !isActionable(target)) return
    this.zone.run(() => target.click())
  }

  register(action: UiShortcutAction): () => void {
    this.actions.add(action)
    this.listen()
    return () => this.actions.delete(action)
  }

  ngOnDestroy(): void {
    if (this.listening) this.document.removeEventListener('keydown', this.onKeydown)
  }

  /**
   * The action to run for the given kinds, in order of preference, or `undefined`.
   * Exposed for the tests; the keyboard goes through `keydown`.
   */
  find(kinds: UiShortcutKind[]): HTMLElement | undefined {
    const modal = this.topModal()
    const focused = this.document.activeElement as HTMLElement | null
    let surface: HTMLElement | null =
      modal && !(focused && modal.contains(focused)) ? modal : this.surfaceAround(focused)

    for (;;) {
      for (const kind of kinds) {
        const candidates = this.shown(kind).filter((element) => this.surfaceOf(element) === surface)
        if (candidates.length === 1) return candidates[0]
        if (candidates.length > 1) return undefined
      }
      if (!surface || surface === modal) break
      surface = this.surfaceOf(surface)
    }

    if (modal) return undefined
    for (const kind of kinds) {
      const candidates = this.shown(kind)
      if (candidates.length === 1) return candidates[0]
      if (candidates.length > 1) return undefined
    }
    return undefined
  }

  private listen(): void {
    if (this.listening) return
    this.listening = true
    this.zone.runOutsideAngular(() => this.document.addEventListener('keydown', this.onKeydown))
  }

  private shown(kind: UiShortcutKind): HTMLElement[] {
    return [...this.actions]
      .filter((action) => action.kind() === kind && isShown(action.element))
      .map((action) => action.element)
  }

  /** The surface an element belongs to, itself excluded; `null` for the page. */
  private surfaceOf(element: HTMLElement): HTMLElement | null {
    return element.parentElement?.closest<HTMLElement>(UI_SHORTCUT_SURFACE_SELECTOR) ?? null
  }

  /** The surface that holds an element, itself included; `null` for the page. */
  private surfaceAround(element: HTMLElement | null): HTMLElement | null {
    return element?.closest<HTMLElement>(UI_SHORTCUT_SURFACE_SELECTOR) ?? null
  }

  /** The last open dialog in the document, which is the one on top. */
  private topModal(): HTMLElement | null {
    const modals = [...this.document.querySelectorAll<HTMLElement>(UI_SHORTCUT_MODAL_SELECTOR)].filter(isShown)
    return modals.length ? modals[modals.length - 1] : null
  }
}
