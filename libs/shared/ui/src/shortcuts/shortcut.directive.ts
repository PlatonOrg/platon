import { Directive, ElementRef, OnDestroy, OnInit, booleanAttribute, effect, inject, input } from '@angular/core'
import { UiShortcutService } from './shortcut.service'
import { UiShortcutKind, ariaKeyShortcutsOf, shortcutLabelOf } from './shortcut.utils'

/**
 * Marks the main action of a surface for the keyboard.
 *
 * ```html
 * <button nz-button nzType="primary" uiShortcut="submit" (click)="next()">Suivant</button>
 * <button nz-button nzType="primary" uiShortcut="save" (click)="save()">Enregistrer</button>
 * ```
 *
 * `submit` answers to Mod+Enter, `save` to Mod+S (and to Mod+Enter when the surface has no
 * `submit`). The button announces its shortcut through `aria-keyshortcuts` and, unless
 * `uiShortcutHint` is false or it already has one, through its `title`.
 * See `docs/raccourcis-clavier.md`.
 */
@Directive({
  selector: '[uiShortcut]',
  standalone: true,
  host: {
    '[attr.aria-keyshortcuts]': 'ariaKeyShortcuts()',
  },
})
export class UiShortcutDirective implements OnInit, OnDestroy {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement
  private readonly service = inject(UiShortcutService)
  private unregister?: () => void
  private hintTitle?: string

  /** The kind of shortcut; empty when the button has none, for buttons rendered from a list. */
  readonly uiShortcut = input.required<UiShortcutKind | null | undefined>()
  readonly uiShortcutHint = input(true, { transform: booleanAttribute })

  protected ariaKeyShortcuts(): string | null {
    const kind = this.uiShortcut()
    return kind ? ariaKeyShortcutsOf(kind) : null
  }

  constructor() {
    // The hint goes in the title, unless the button already has its own title.
    effect(() => {
      const kind = this.uiShortcut()
      const hint = kind && this.uiShortcutHint() ? `Raccourci clavier : ${shortcutLabelOf(kind)}` : undefined
      const title = this.host.getAttribute('title')
      if (title !== null && title !== this.hintTitle) return
      if (hint) this.host.setAttribute('title', hint)
      else this.host.removeAttribute('title')
      this.hintTitle = hint
    })
  }

  ngOnInit(): void {
    this.unregister = this.service.register({ element: this.host, kind: () => this.uiShortcut() })
  }

  ngOnDestroy(): void {
    this.unregister?.()
  }
}

/**
 * Marks an element as its own surface for the keyboard shortcuts: the actions inside it answer
 * when the focus is inside it, and do not compete with the actions of the page around it.
 * Dialogs (`role="dialog"`) are surfaces without this directive.
 */
@Directive({
  selector: '[uiShortcutSurface]',
  standalone: true,
  host: {
    'data-ui-shortcut-surface': '',
  },
})
export class UiShortcutSurfaceDirective {}
