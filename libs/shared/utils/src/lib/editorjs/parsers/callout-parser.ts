type CalloutVariant = 'info' | 'important' | 'dialogue'

interface CalloutData {
  variant: CalloutVariant
  text: string
}

// Dupliqué depuis `CalloutTool` (libs/shared/ui) plutôt qu'importé, pour éviter une dépendance
// circulaire entre shared/utils et shared/ui (ui importe déjà EditorjsViewerService de utils).
const VARIANT_ICONS: Record<CalloutVariant, string> = {
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  important:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 1 21h22L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5M12 17v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  dialogue:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

export const CalloutParser = function (data: CalloutData): string {
  const icon = VARIANT_ICONS[data.variant] ?? VARIANT_ICONS.info
  return `<div class="ce-callout ce-callout--${data.variant}"><span class="ce-callout__icon">${icon}</span><p>${data.text}</p></div>`
}
