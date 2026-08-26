import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'
import { NzInputNumberModule } from 'ng-zorro-antd/input-number'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'

import { ActivitySettings } from '@platon/feature/compiler'

@Component({
  selector: 'app-graded-activity-settings',
  templateUrl: './graded-activity-settings.component.html',
  styleUrls: ['./graded-activity-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    NzInputNumberModule,
    NzCheckboxModule,
    NzToolTipModule,
  ],
})
export class GradedActivitySettingsComponent {
  protected readonly durationHours = signal(0)
  protected readonly durationMinutes = signal(0)
  protected readonly durationSeconds = signal(0)
  protected readonly maxAttempts = signal(0)
  protected readonly noCopyPaste = signal(true)
  protected readonly terminateOnLeavePage = signal(true)
  protected readonly terminateOnLoseFocus = signal(true)

  // Code de déblocage demandé à l'élève en sortie d'activité : uniquement généré aléatoirement,
  // jamais saisi à la main par l'enseignant pour éviter les codes trop simples (ex: "123456").
  readonly code = signal(this.generateCode())

  protected regenerateCode(): void {
    this.code.set(this.generateCode())
  }

  private generateCode(): string {
    // crypto.getRandomValues plutôt que Math.random() : ce code sert à débloquer un examen,
    // il doit être imprévisible (Math.random() n'est pas un générateur cryptographiquement sûr).
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const randomValues = crypto.getRandomValues(new Uint32Array(6))
    return Array.from(randomValues, (value) => charset[value % charset.length]).join('')
  }

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
