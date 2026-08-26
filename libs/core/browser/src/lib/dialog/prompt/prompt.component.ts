import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'core-dialog-prompt',
  templateUrl: './prompt.component.html',
  styleUrls: ['./prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CommonModule],
})
export class PromptDialogComponent {
  @Input() value? = ''
  @Input() label = ''

  @Input() okTitle = 'OK'
  @Input() noTitle = 'Annuler'

  @Output() confirmEvent = new EventEmitter<string | undefined>()

  protected confirm(): void {
    if (this.value) {
      this.confirmEvent.emit(this.value)
    }
  }

  protected cancel(): void {
    this.confirmEvent.emit(undefined)
  }
}
