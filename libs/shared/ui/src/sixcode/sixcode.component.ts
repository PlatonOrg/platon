import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core'

@Component({
  selector: 'ui-sixcode',
  imports: [],
  templateUrl: './sixcode.component.html',
  styleUrls: ['./sixcode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SixcodeComponent {
  readonly disabled = input(false)
  readonly placeholder = input('•')
  readonly autoFocus = input(true)
  readonly error = input(false)

  readonly codeComplete = output<string>()

  readonly codeInputs = viewChildren<ElementRef<HTMLInputElement>>('codeInput')

  codes = signal<string[]>(['', '', '', '', '', ''])
  hasError = signal(false)

  constructor() {
    // Réaffiche l'erreur reçue du parent (le clear local se fait dans onKeyDown).
    // Une erreur ne survient qu'une fois les 6 cases remplies : on remet le focus sur la
    // dernière plutôt que sur la première, pour que l'utilisateur puisse tout effacer
    // en backspacant depuis la fin sans avoir à s'y déplacer manuellement.
    effect(
      () => {
        const hasError = this.error()
        this.hasError.set(hasError)
        if (hasError && this.autoFocus()) {
          untracked(() => this.focusInput(this.codes().length - 1))
        }
      },
      { allowSignalWrites: true }
    )

    // Focus le premier champ vide dès que les inputs sont rendus, sans setTimeout artificiel
    effect(() => {
      if (this.autoFocus() && this.codeInputs().length > 0) {
        this.focusFirstEmpty()
      }
    })
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement
    let value = input.value

    // Ne garder que le dernier caractère saisi
    if (value.length > 1) {
      value = value.slice(-1)
    }

    // Filtrer pour ne garder que les caractères alphanumériques
    value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    this.codes.update((codes) => {
      const next = [...codes]
      next[index] = value
      return next
    })

    // Passer au champ suivant si un caractère a été saisi
    if (value && index < this.codes().length - 1) {
      this.focusInput(index + 1)
    }

    this.checkCodeComplete()
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    this.hasError.set(false)

    // Gérer la touche Backspace
    if (event.key === 'Backspace') {
      // On gère nous-mêmes la suppression : on empêche l'action native pour éviter
      // qu'elle ne déclenche un second événement "input" en plus de notre mise à jour.
      event.preventDefault()

      // Vider la case actuelle et reculer d'une case (même si elle était déjà vide),
      // pour pouvoir tout effacer en maintenant Backspace sans double-appui par case.
      this.codes.update((codes) => {
        const next = [...codes]
        next[index] = ''
        return next
      })
      if (index > 0) {
        this.focusInput(index - 1)
      }
      this.checkCodeComplete()
    }

    // Gérer les flèches gauche/droite
    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1)
    }

    if (event.key === 'ArrowRight' && index < this.codes().length - 1) {
      this.focusInput(index + 1)
    }

    // Empêcher la saisie si le caractère n'est pas alphanumérique
    if (
      !/[a-zA-Z0-9]/.test(event.key) &&
      !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      event.preventDefault()
    }
  }

  onFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement
    input.select()
  }

  onPaste(event: ClipboardEvent, startIndex: number): void {
    event.preventDefault()

    const pasteData = event.clipboardData?.getData('text') || ''
    const cleanData = pasteData.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    this.codes.update((codes) => {
      const next = [...codes]
      for (let i = 0; i < cleanData.length && startIndex + i < next.length; i++) {
        next[startIndex + i] = cleanData[i]
      }
      return next
    })

    // Focuser le prochain champ vide ou le dernier champ
    const nextIndex = Math.min(startIndex + cleanData.length, this.codes().length - 1)
    this.focusInput(nextIndex)

    this.checkCodeComplete()
  }

  private focusInput(index: number): void {
    setTimeout(() => {
      this.codeInputs()[index]?.nativeElement.focus()
    })
  }

  private focusFirstEmpty(): void {
    // untracked : cette méthode est aussi appelée depuis l'effet d'autofocus initial,
    // qui ne doit réagir qu'à codeInputs()/autoFocus(), pas se redéclencher à chaque
    // frappe simplement parce qu'elle lit codes() au passage.
    const firstEmptyIndex = untracked(() => this.codes().findIndex((code) => !code))
    this.focusInput(firstEmptyIndex === -1 ? 0 : firstEmptyIndex)
  }

  private checkCodeComplete(): void {
    const codes = this.codes()
    const isComplete = codes.every((code) => code.length === 1)
    if (isComplete) {
      this.codeComplete.emit(codes.join(''))
    }
  }

  // Méthode publique pour réinitialiser le composant
  reset(): void {
    this.codes.set(['', '', '', '', '', ''])
    if (this.autoFocus()) {
      this.focusFirstEmpty()
    }
  }

  // Méthode publique pour définir une valeur
  setValue(value: string): void {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    this.codes.set(Array.from({ length: 6 }, (_, i) => cleanValue[i] || ''))
    this.checkCodeComplete()
  }
}
