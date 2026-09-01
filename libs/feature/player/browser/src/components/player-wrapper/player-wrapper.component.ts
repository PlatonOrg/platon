import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'

import { Player } from '@platon/feature/player/common'
import { UiErrorComponent } from '@platon/shared/ui'
import { PlayerActivityComponent } from '../player-activity/player-activity.component'
import { PlayerExerciseComponent } from '../player-exercise/player-exercise.component'

@Component({
  standalone: true,
  selector: 'player-wrapper',
  templateUrl: './player-wrapper.component.html',
  styleUrls: ['./player-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.embedded]': 'embedded()' },
  imports: [CommonModule, UiErrorComponent, PlayerExerciseComponent, PlayerActivityComponent],
})
export class PlayerWrapperComponent {
  readonly player = input.required<Player>()
  readonly embedded = input(false)
}
