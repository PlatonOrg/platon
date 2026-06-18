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

  constructor() {
    super()
  }

  override setValue(value: AutomatonEditorState['automaton']): void {
    super.setValue(value)
    this.lastCommittedSignature = this.toSignature(value)
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

    this.value = nextValue
    this.lastCommittedSignature = nextSignature
    this.notifyValueChange?.(nextValue)
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
