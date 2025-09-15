import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'
import { Resource } from '@platon/feature/resource/common'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

@Component({
  standalone: true,
  selector: 'resource-template-card',
  templateUrl: './template-card.component.html',
  styleUrls: ['./template-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
})
export class TemplateCardComponent {
  @Input({ required: true }) template!: Resource
  @Output() templateSelected = new EventEmitter<string>()

  protected onSelectTemplate(): void {
    this.templateSelected.emit(this.template.id)
  }

  protected templateReferences(): number {
    return this.template.statistic?.exercise?.references?.template ?? 0
  }

  protected templateUtilizations(): number {
    return this.template.statistic?.exercise?.references?.referencesAttemptCount ?? 0
  }
}
