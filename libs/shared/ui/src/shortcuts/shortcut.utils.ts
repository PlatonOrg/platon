/**
 * `submit` moves the work forward (Suivant, Créer, Déplacer, Valider) and answers to Mod+Enter.
 * `save` keeps the current state without leaving the screen (Enregistrer) and answers to Mod+S.
 */
export type UiShortcutKind = 'submit' | 'save'

/** Elements that start a new shortcut surface: dialogs, and anything marked `uiShortcutSurface`. */
export const UI_SHORTCUT_SURFACE_SELECTOR = '[data-ui-shortcut-surface], [role="dialog"], [role="alertdialog"]'

/** Dialogs that keep the keyboard for themselves while they are open. */
export const UI_SHORTCUT_MODAL_SELECTOR = '[role="dialog"], [role="alertdialog"]'

/** Whether the platform names its main modifier Command (⌘) rather than Control. */
export const isApplePlatform = (nav: Navigator | undefined = globalThis.navigator): boolean => {
  if (!nav) return false
  const platform =
    (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || nav.platform || ''
  return /mac|iphone|ipad|ipod/i.test(platform)
}

/** The kind of shortcut a keyboard event asks for, or `undefined` when it is not one of ours. */
export const shortcutKindOf = (event: KeyboardEvent): UiShortcutKind | undefined => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return undefined
  if (event.key === 'Enter') return 'submit'
  if (event.key === 's' || event.key === 'S') return 'save'
  return undefined
}

/** Value of `aria-keyshortcuts` for a kind of shortcut. */
export const ariaKeyShortcutsOf = (kind: UiShortcutKind, apple = isApplePlatform()): string => {
  const modifier = apple ? 'Meta' : 'Control'
  return kind === 'submit' ? `${modifier}+Enter` : `${modifier}+S`
}

/** Short label of a shortcut, as shown to the user: `⌘↵`, `Ctrl+Entrée`, `⌘S`, `Ctrl+S`. */
export const shortcutLabelOf = (kind: UiShortcutKind, apple = isApplePlatform()): string => {
  if (apple) return kind === 'submit' ? '⌘↵' : '⌘S'
  return kind === 'submit' ? 'Ctrl+Entrée' : 'Ctrl+S'
}

/** Whether an element takes room on the screen and is not hidden from the user. */
export const isShown = (element: HTMLElement): boolean =>
  element.isConnected && element.getClientRects().length > 0 && !element.closest('[inert], [aria-hidden="true"]')

/** Whether a button can act: not disabled, not marked disabled, not busy. */
export const isActionable = (element: HTMLElement): boolean =>
  !(element as HTMLButtonElement).disabled &&
  element.getAttribute('aria-disabled') !== 'true' &&
  element.getAttribute('aria-busy') !== 'true' &&
  !element.classList.contains('ant-btn-loading')
