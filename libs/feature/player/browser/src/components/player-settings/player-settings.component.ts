import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { MatIconModule } from '@angular/material/icon'

import { ActivityPlayer } from '@platon/feature/player/common'
import { DurationPipe } from '@platon/shared/ui'

@Component({
  selector: 'player-settings',
  templateUrl: './player-settings.component.html',
  styleUrls: ['./player-settings.component.scss', '../common.style.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, DurationPipe],
})
export class PlayerSettingsComponent {
  @Input() player!: ActivityPlayer

  get hasAvailableFeatures(): boolean {
    return !!(
      this.player.settings?.feedback?.validation ||
      this.player.settings?.feedback?.review ||
      this.player.settings?.actions?.hints ||
      this.player.settings?.actions?.theories ||
      this.player.settings?.actions?.solution ||
      this.player.settings?.actions?.reroll
    )
  }

  get hasSecurityRestrictions(): boolean {
    return !!(
      this.player.settings?.security?.noCopyPaste ||
      this.player.settings?.security?.terminateOnLoseFocus ||
      this.player.settings?.security?.terminateOnLeavePage ||
      this.hasRetryLimit
    )
  }

  get hasRetryLimit(): boolean {
    return !!(this.player.settings?.actions?.retry !== undefined && this.player.settings?.actions?.retry > 0)
  }

  get retryLimit(): number {
    return this.player.settings?.actions?.retry || 0
  }
}
