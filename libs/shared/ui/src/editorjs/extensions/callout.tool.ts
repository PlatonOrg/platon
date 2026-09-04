import { BlockTool, BlockToolConstructorOptions, BlockToolData } from '@editorjs/editorjs'

export type CalloutVariant = 'info' | 'important' | 'dialogue'

export interface CalloutData {
  variant: CalloutVariant
  text: string
}

const VARIANTS: { value: CalloutVariant; label: string; icon: string }[] = [
  {
    value: 'info',
    label: 'Info',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  },
  {
    value: 'important',
    label: 'Important',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 1 21h22L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5M12 17v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  },
  {
    value: 'dialogue',
    label: 'Question',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
]

const DEFAULT_VARIANT: CalloutVariant = 'info'

// Bloc "encadré" à plusieurs variantes (info / important / dialogue) (bulles de dialogue question/réponse, pas juste une info
// box générique). Outil maison : aucun bloc équivalent n'existe côté EditorJS/npm.

export class CalloutTool implements BlockTool {
  static get toolbox() {
    return {
      title: 'Encadré',
      icon: '<svg width="17" height="15" viewBox="0 0 17 15" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h13v3H2zM2 7h13v1H2zM2 10h9v1H2zM2 13h9v1H2z" fill="currentColor"/></svg>',
    }
  }

  static get isReadOnlySupported(): boolean {
    return true
  }

  private data: CalloutData
  private readonly readOnly: boolean
  private wrapper?: HTMLDivElement
  private textElement?: HTMLDivElement

  constructor({ data, readOnly }: BlockToolConstructorOptions<CalloutData>) {
    this.readOnly = !!readOnly
    this.data = {
      variant: data?.variant ?? DEFAULT_VARIANT,
      text: data?.text ?? '',
    }
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div')
    this.wrapper.classList.add('ce-callout')
    this.wrapper.dataset['variant'] = this.data.variant

    if (!this.readOnly) {
      const variantPicker = document.createElement('div')
      variantPicker.classList.add('ce-callout__variants')
      VARIANTS.forEach(({ value, label, icon }) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.title = label
        button.classList.add('ce-callout__variant-button')
        button.classList.toggle('ce-callout__variant-button--active', value === this.data.variant)
        button.innerHTML = icon
        button.addEventListener('click', () => this.setVariant(value))
        variantPicker.appendChild(button)
      })
      this.wrapper.appendChild(variantPicker)
    }

    this.textElement = document.createElement('div')
    this.textElement.classList.add('ce-callout__text')
    this.textElement.contentEditable = this.readOnly ? 'false' : 'true'
    this.textElement.dataset['placeholder'] = 'Écrivez votre texte...'
    this.textElement.innerHTML = this.data.text
    this.wrapper.appendChild(this.textElement)

    return this.wrapper
  }

  save(): BlockToolData<CalloutData> {
    return {
      variant: (this.wrapper?.dataset['variant'] as CalloutVariant) ?? this.data.variant,
      text: this.textElement?.innerHTML ?? '',
    }
  }

  private setVariant(variant: CalloutVariant): void {
    if (!this.wrapper) {
      return
    }
    this.data.variant = variant
    this.wrapper.dataset['variant'] = variant
    this.wrapper.querySelectorAll('.ce-callout__variant-button').forEach((button, index) => {
      button.classList.toggle('ce-callout__variant-button--active', VARIANTS[index].value === variant)
    })
  }
}
