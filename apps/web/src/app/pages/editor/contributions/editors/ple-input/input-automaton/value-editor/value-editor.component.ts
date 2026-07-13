import { ChangeDetectionStrategy, Component } from '@angular/core'
import { AutomatonEditorState } from '@platon/feature/webcomponent'
import { BaseValueEditor } from '../../ple-input'

@Component({
  selector: 'app-input-automaton-value-editor',
  templateUrl: 'value-editor.component.html',
  styleUrls: ['value-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValueEditorComponent extends BaseValueEditor<AutomatonEditorState['automaton']> {
  private lastCommittedSignature?: string

  public editorState!: AutomatonEditorState

  constructor() {
    super()
  }

  override setValue(value: AutomatonEditorState['automaton']): void {
    const rawValue = value ? this.safeUnwrap(value) : value

    super.setValue(rawValue)
    this.lastCommittedSignature = this.toSignature(rawValue)
    this.editorState = { automaton: rawValue } as unknown as AutomatonEditorState
    this.changeDetectorRef.markForCheck()
  }

  protected onStateChange(value: unknown): void {
    /**
     * TODO: Consider fixing the underlying issue in the AutomatonEditorState that causes unnecessary state changes.
     */
    const nextValue = value as AutomatonEditorState['automaton']
    const nextSignature = this.toSignature(nextValue)

    if (nextSignature === this.lastCommittedSignature) {
      return
    }

    const rawNextValue = nextValue ? this.safeUnwrap(nextValue) : nextValue
    this.value = rawNextValue
    this.lastCommittedSignature = nextSignature

    this.notifyValueChange?.(rawNextValue)
    this.changeDetectorRef.markForCheck()
  }

  // remove proxy around value
  private safeUnwrap(value: any): any {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch (e) {
      return value
    }
  }

  private toSignature(value: AutomatonEditorState['automaton'] | undefined): string {
    if (value === undefined) {
      return 'undefined'
    }

    try {
      return JSON.stringify(value)
    } catch {
      // Fallback: if serialization fails, keep behavior deterministic and treat as changed.
      return String(value)
    }
  }
}
