import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { UiShortcutDirective, UiShortcutSurfaceDirective } from './shortcut.directive'
import { UiShortcutKind, ariaKeyShortcutsOf, shortcutKindOf, shortcutLabelOf } from './shortcut.utils'

type Button = { id: string; kind?: UiShortcutKind; disabled?: boolean; title?: string }
type Surface = { id: string; role?: 'dialog'; buttons: Button[] }

@Component({
  imports: [UiShortcutDirective, UiShortcutSurfaceDirective],
  template: `
    <input id="page-input" />
    @for (button of page(); track button.id) {
    <button
      [id]="button.id"
      [uiShortcut]="button.kind"
      [disabled]="!!button.disabled"
      [attr.title]="button.title ?? null"
      (click)="clicked.push(button.id)"
    >
      {{ button.id }}
    </button>
    } @for (surface of surfaces(); track surface.id) { @if (surface.role) {
    <section [id]="surface.id" [attr.role]="surface.role">
      <input [id]="surface.id + '-input'" />
      @for (button of surface.buttons; track button.id) {
      <button [id]="button.id" [uiShortcut]="button.kind" (click)="clicked.push(button.id)">
        {{ button.id }}
      </button>
      }
    </section>
    } @else {
    <section [id]="surface.id" uiShortcutSurface>
      <input [id]="surface.id + '-input'" />
      @for (button of surface.buttons; track button.id) {
      <button
        [id]="button.id"
        [uiShortcut]="button.kind"
        [disabled]="!!button.disabled"
        (click)="clicked.push(button.id)"
      >
        {{ button.id }}
      </button>
      }
    </section>
    } }
  `,
})
class HostComponent {
  readonly page = signal<Button[]>([])
  readonly surfaces = signal<Surface[]>([])
  readonly clicked: string[] = []
}

describe('UiShortcutService', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  const setup = (page: Button[], surfaces: Surface[] = []) => {
    host.page.set(page)
    host.surfaces.set(surfaces)
    fixture.detectChanges()
  }

  const press = (key: string, init: KeyboardEventInit = { ctrlKey: true }, target?: string): KeyboardEvent => {
    const element = target ? (document.getElementById(target) as HTMLElement) : document.body
    if (target) element.focus()
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    element.dispatchEvent(event)
    return event
  }

  beforeEach(() => {
    // jsdom lays nothing out: an element is shown unless it sits under `hidden`.
    jest.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
      return (this.closest('[hidden]') ? [] : [{}]) as unknown as DOMRectList
    })
    TestBed.configureTestingModule({ imports: [HostComponent] })
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    document.body.appendChild(fixture.nativeElement)
  })

  afterEach(() => {
    fixture.destroy()
    ;(fixture.nativeElement as HTMLElement).remove()
    jest.restoreAllMocks()
  })

  describe('Mod+Enter', () => {
    it('runs the single submit action of the page, with Control or with Command', () => {
      setup([{ id: 'next', kind: 'submit' }, { id: 'back' }])
      expect(press('Enter', { ctrlKey: true }).defaultPrevented).toBe(true)
      press('Enter', { metaKey: true })
      expect(host.clicked).toEqual(['next', 'next'])
    })

    it('does nothing when two submit actions compete', () => {
      setup([
        { id: 'a', kind: 'submit' },
        { id: 'b', kind: 'submit' },
      ])
      expect(press('Enter').defaultPrevented).toBe(false)
      expect(host.clicked).toEqual([])
    })

    it('does not run a disabled action, and keeps the key from going further', () => {
      setup([{ id: 'next', kind: 'submit', disabled: true }])
      expect(press('Enter').defaultPrevented).toBe(true)
      expect(host.clicked).toEqual([])
    })

    it('runs the save action when the surface has no submit action (tolerant rule)', () => {
      setup([{ id: 'save', kind: 'save' }])
      press('Enter')
      expect(host.clicked).toEqual(['save'])
    })

    it('prefers the submit action to the save action of the same surface', () => {
      setup([
        { id: 'save', kind: 'save' },
        { id: 'next', kind: 'submit' },
      ])
      press('Enter')
      expect(host.clicked).toEqual(['next'])
    })

    it('ignores other modifiers, composition and events already handled', () => {
      setup([{ id: 'next', kind: 'submit' }])
      press('Enter', { ctrlKey: true, shiftKey: true })
      press('Enter', { ctrlKey: true, altKey: true })
      press('Enter', { ctrlKey: true, isComposing: true })
      press('Enter', {})
      const handled = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true })
      handled.preventDefault()
      document.body.dispatchEvent(handled)
      expect(host.clicked).toEqual([])
    })

    it('does not run again while the key is held down', () => {
      setup([{ id: 'next', kind: 'submit' }])
      press('Enter', { ctrlKey: true, repeat: true })
      expect(host.clicked).toEqual([])
    })
  })

  describe('surfaces', () => {
    const atelier = (): Surface[] => [{ id: 'preview', buttons: [{ id: 'validate', kind: 'submit' }] }]

    it('runs the action of the surface that holds the focus', () => {
      setup([{ id: 'save', kind: 'save' }], atelier())
      press('Enter', { ctrlKey: true }, 'preview-input')
      expect(host.clicked).toEqual(['validate'])
    })

    it('runs the action of the page when the focus is outside the surfaces', () => {
      setup([{ id: 'save', kind: 'save' }], atelier())
      press('Enter', { ctrlKey: true }, 'page-input')
      expect(host.clicked).toEqual(['save'])
    })

    it('goes up to the page when the surface of the focus has no candidate', () => {
      setup([{ id: 'save', kind: 'save' }], atelier())
      press('s', { ctrlKey: true }, 'preview-input')
      expect(host.clicked).toEqual(['save'])
    })

    it('runs the single action of the page, wherever it is, when the focus is nowhere', () => {
      setup([], atelier())
      press('Enter')
      expect(host.clicked).toEqual(['validate'])
    })

    it('does nothing from nowhere when several surfaces have an action', () => {
      setup(
        [],
        [
          { id: 'ex1', buttons: [{ id: 'validate1', kind: 'submit' }] },
          { id: 'ex2', buttons: [{ id: 'validate2', kind: 'submit' }] },
        ]
      )
      press('Enter')
      expect(host.clicked).toEqual([])
      press('Enter', { ctrlKey: true }, 'ex2-input')
      expect(host.clicked).toEqual(['validate2'])
    })

    it('keeps the keyboard inside an open dialog, even when the focus is outside', () => {
      setup(
        [{ id: 'next', kind: 'submit' }],
        [{ id: 'move', role: 'dialog', buttons: [{ id: 'confirm', kind: 'submit' }] }]
      )
      press('Enter', { ctrlKey: true }, 'page-input')
      expect(host.clicked).toEqual(['confirm'])
    })

    it('does not leave an open dialog that has no action', () => {
      setup([{ id: 'next', kind: 'submit' }], [{ id: 'info', role: 'dialog', buttons: [] }])
      press('Enter', { ctrlKey: true }, 'info-input')
      expect(host.clicked).toEqual([])
    })

    it('ignores the actions that are not shown', () => {
      setup([{ id: 'next', kind: 'submit' }], [{ id: 'hidden', buttons: [{ id: 'other', kind: 'submit' }] }])
      document.getElementById('hidden')?.setAttribute('hidden', '')
      press('Enter')
      expect(host.clicked).toEqual(['next'])
    })
  })

  describe('Mod+S', () => {
    it('runs the save action and keeps the browser from saving the page', () => {
      setup([{ id: 'save', kind: 'save' }])
      expect(press('s', { metaKey: true }).defaultPrevented).toBe(true)
      expect(host.clicked).toEqual(['save'])
    })

    it('never runs a submit action', () => {
      setup([{ id: 'next', kind: 'submit' }])
      expect(press('s').defaultPrevented).toBe(false)
      expect(host.clicked).toEqual([])
    })

    it('keeps the browser from saving the page when two save actions compete', () => {
      setup([
        { id: 'a', kind: 'save' },
        { id: 'b', kind: 'save' },
      ])
      expect(press('s').defaultPrevented).toBe(true)
      expect(host.clicked).toEqual([])
    })
  })

  describe('hint', () => {
    it('announces the shortcut and adds a title', () => {
      setup([{ id: 'next', kind: 'submit' }, { id: 'back' }])
      const next = document.getElementById('next') as HTMLElement
      const back = document.getElementById('back') as HTMLElement
      expect(next.getAttribute('aria-keyshortcuts')).toBe(ariaKeyShortcutsOf('submit'))
      expect(next.getAttribute('title')).toBe(`Raccourci clavier : ${shortcutLabelOf('submit')}`)
      expect(back.hasAttribute('aria-keyshortcuts')).toBe(false)
      expect(back.hasAttribute('title')).toBe(false)
    })

    it('keeps the title the button already has', () => {
      setup([{ id: 'next', kind: 'submit', title: 'Passer à l’étape suivante' }])
      expect(document.getElementById('next')?.getAttribute('title')).toBe('Passer à l’étape suivante')
    })
  })
})

describe('shortcut utils', () => {
  it('reads the kind of a keyboard event', () => {
    expect(shortcutKindOf(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }))).toBe('submit')
    expect(shortcutKindOf(new KeyboardEvent('keydown', { key: 'S', metaKey: true }))).toBe('save')
    expect(shortcutKindOf(new KeyboardEvent('keydown', { key: 'Enter' }))).toBeUndefined()
    expect(shortcutKindOf(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true }))).toBeUndefined()
  })

  it('names the shortcuts after the platform', () => {
    expect(shortcutLabelOf('submit', true)).toBe('⌘↵')
    expect(shortcutLabelOf('save', true)).toBe('⌘S')
    expect(shortcutLabelOf('submit', false)).toBe('Ctrl+Entrée')
    expect(ariaKeyShortcutsOf('submit', true)).toBe('Meta+Enter')
    expect(ariaKeyShortcutsOf('save', false)).toBe('Control+S')
  })
})
