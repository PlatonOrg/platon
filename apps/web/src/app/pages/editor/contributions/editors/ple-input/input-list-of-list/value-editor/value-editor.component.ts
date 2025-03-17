import { Component, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core'
import { BaseValueEditor } from '../../ple-input'
import { InputListOfList } from '../input-list-of-list'

@Component({
  selector: 'app-value-editor',
  templateUrl: './value-editor.component.html',
  styleUrl: './value-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueEditorComponent extends BaseValueEditor<InputListOfList[]> {
  @ViewChild('editInput') editInput?: ElementRef

  // Liste des fonctions Python à reconnaître
  private pythonFunctions = ['choice', 'random', 'randint', 'range']

  selectedIndex: number | null = null
  editingIndex: number | null = null
  currentArgv = ''
  newCommandName = ''

  // Getter public pour accéder à value dans le template
  get items(): InputListOfList[] {
    return this.value || []
  }

  constructor() {
    super()
  }

  override setValue(value: InputListOfList[]): void {
    super.setValue(value && Array.isArray(value) ? value : [])
    this.changeDetectorRef.markForCheck()
  }

  startEditing(index: number): void {
    this.editingIndex = index
    setTimeout(() => {
      if (this.editInput) {
        this.editInput.nativeElement.focus()
      }
    }, 500)
  }

  finishEditing(): void {
    this.editingIndex = null
  }

  editName(index: number, name: string): void {
    if (this.items[index]) {
      this.items[index].name_test = name
      this.notifyValueChange?.(this.items)
      this.changeDetectorRef.markForCheck()
    }
  }

  removeItem(index: number): void {
    const values = this.items
    values.splice(index, 1)
    this.notifyValueChange?.(values)

    if (this.selectedIndex === index) {
      this.selectedIndex = null
    } else if (this.selectedIndex !== null && this.selectedIndex > index) {
      this.selectedIndex--
    }

    this.changeDetectorRef.markForCheck()
  }

  addItem(): void {
    const defaultName = `test${this.items.length + 1}`

    const values = this.items
    values.push({ name_test: defaultName, argv: [''], line_cmd: '' })
    this.notifyValueChange?.(values)
    this.selectedIndex = values.length - 1
    this.currentArgv = ''
    this.changeDetectorRef.markForCheck()
  }

  // On empêche la selection pendant l'edition
  selectItem(index: number): void {
    if (this.editingIndex === index) {
      return
    }

    this.selectedIndex = index
    const item = this.items[index]

    if (item) {
      this.currentArgv = item.argv.join('; ')
    }
    this.changeDetectorRef.markForCheck()
  }

  updateArgv(): void {
    if (this.selectedIndex !== null) {
      const values = this.items
      values[this.selectedIndex].argv = this.currentArgv.split(';').map((arg) => arg.trim())
      this.notifyValueChange?.(values)
    }
  }

  updateLineCmd(value: string): void {
    if (this.selectedIndex !== null) {
      const values = this.items
      values[this.selectedIndex].line_cmd = value
      this.notifyValueChange?.(values)
    }
  }

  getSelectedItem(): InputListOfList | null {
    if (this.selectedIndex !== null && this.items[this.selectedIndex]) {
      return this.items[this.selectedIndex]
    }
    return null
  }
}
