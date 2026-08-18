import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { MatIconModule } from '@angular/material/icon'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'

import { ActivitySettings } from '@platon/feature/compiler'

@Component({
  standalone: true,
  selector: 'app-graded-activity-settings',
  templateUrl: './graded-activity-settings.component.html',
  styleUrls: ['./graded-activity-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, NzInputNumberModule, NzCheckboxModule, NzToolTipModule],
})
export class GradedActivitySettingsComponent {
  protected readonly durationHours = signal(0)
  protected readonly durationMinutes = signal(0)
  protected readonly durationSeconds = signal(0)
  protected readonly maxAttempts = signal(0)
  protected readonly noCopyPaste = signal(true)
  protected readonly terminateOnLeavePage = signal(true)
  protected readonly terminateOnLoseFocus = signal(true)

  // Les TP notés / examens n'affichent jamais ces actions aux élèves : pas de configuration nécessaire.
  readonly settings = computed<ActivitySettings>(() => ({
    duration: this.durationHours() * 3600 + this.durationMinutes() * 60 + this.durationSeconds(),
    actions: {
      retry: this.maxAttempts(),
      hints: false,
      reroll: false,
      theories: false,
      solution: false,
    },
    security: {
      noCopyPaste: this.noCopyPaste(),
      terminateOnLeavePage: this.terminateOnLeavePage(),
      terminateOnLoseFocus: this.terminateOnLoseFocus(),
    },
  }))
}
