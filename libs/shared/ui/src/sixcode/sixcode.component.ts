import {
  Component,
  EventEmitter,
  Output,
  Input,
  OnInit,
  ElementRef,
  ViewChildren,
  QueryList,
  ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'ui-sixcode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sixcode.component.html',
  styleUrls: ['./sixcode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SixcodeComponent implements OnInit {
  @Output() codeComplete = new EventEmitter<string>()
  @Input() disabled = false
  @Input() placeholder = '•'
  @Input() autoFocus = true

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>

  codes: string[] = ['', '', '', '', '', '']

  ngOnInit(): void {
    // Focus sur le premier input si autoFocus est activé
    if (this.autoFocus) {
      setTimeout(() => {
        this.focusFirstEmpty()
      })
    }
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement
    let value = input.value

    // Ne garder que le dernier caractère saisi
    if (value.length > 1) {
      value = value.slice(-1)
    }

    // Filtrer pour ne garder que les caractères alphanumériques
    value = value.replace(/[^a-zA-Z0-9]/g, '')

    // Mettre à jour le tableau et l'input
    this.codes[index] = value.toUpperCase()
    input.value = this.codes[index]

    // Passer au champ suivant si un caractère a été saisi
    if (value && index < this.codes.length - 1) {
      this.focusInput(index + 1)
    }

    // Vérifier si le code est complet
    this.checkCodeComplete()
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement

    // Gérer la touche Backspace
    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        // Si le champ est vide, revenir au champ précédent et le vider
        this.focusInput(index - 1)
        this.codes[index - 1] = ''
        const prevInput = this.codeInputs.toArray()[index - 1].nativeElement
        prevInput.value = ''
      } else {
        // Vider le champ actuel
        this.codes[index] = ''
        input.value = ''
      }
      this.checkCodeComplete()
    }

    // Gérer les flèches gauche/droite
    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1)
    }

    if (event.key === 'ArrowRight' && index < this.codes.length - 1) {
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

  onPaste(event: ClipboardEvent, startIndex: number): void {
    event.preventDefault()

    const pasteData = event.clipboardData?.getData('text') || ''
    const cleanData = pasteData.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    // Répartir les caractères collés dans les champs disponibles
    for (let i = 0; i < cleanData.length && startIndex + i < this.codes.length; i++) {
      this.codes[startIndex + i] = cleanData[i]
      const input = this.codeInputs.toArray()[startIndex + i].nativeElement
      input.value = cleanData[i]
    }

    // Focuser le prochain champ vide ou le dernier champ
    const nextIndex = Math.min(startIndex + cleanData.length, this.codes.length - 1)
    this.focusInput(nextIndex)

    this.checkCodeComplete()
  }

  private focusInput(index: number): void {
    setTimeout(() => {
      const inputs = this.codeInputs.toArray()
      if (inputs[index]) {
        inputs[index].nativeElement.focus()
        inputs[index].nativeElement.select()
      }
    })
  }

  private focusFirstEmpty(): void {
    const firstEmptyIndex = this.codes.findIndex((code) => !code)
    if (firstEmptyIndex !== -1) {
      this.focusInput(firstEmptyIndex)
    } else {
      this.focusInput(0)
    }
  }

  private checkCodeComplete(): void {
    const isComplete = this.codes.every((code) => code.length === 1)
    if (isComplete) {
      const fullCode = this.codes.join('')
      this.codeComplete.emit(fullCode)
    }
  }

  // Méthode publique pour réinitialiser le composant
  reset(): void {
    this.codes = ['', '', '', '', '', '']
    this.codeInputs.toArray().forEach((input) => {
      input.nativeElement.value = ''
    })
    if (this.autoFocus) {
      this.focusFirstEmpty()
    }
  }

  // Méthode publique pour définir une valeur
  setValue(value: string): void {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    for (let i = 0; i < 6; i++) {
      this.codes[i] = cleanValue[i] || ''
      const input = this.codeInputs.toArray()[i]?.nativeElement
      if (input) {
        input.value = this.codes[i]
      }
    }

    this.checkCodeComplete()
  }
}
