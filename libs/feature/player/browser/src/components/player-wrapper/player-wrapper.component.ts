import { ChangeDetectionStrategy, Component, input } from '@angular/core'

import { type Player } from '@platon/feature/player/common'
import { PlayerActivityComponent } from '../player-activity/player-activity.component'
import { PlayerExerciseComponent } from '../player-exercise/player-exercise.component'

@Component({
  selector: 'player-wrapper',
  templateUrl: './player-wrapper.component.html',
  styleUrls: ['./player-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.embedded]': 'embedded()' },
  imports: [PlayerExerciseComponent, PlayerActivityComponent],
})
export class PlayerWrapperComponent {
  readonly player = input.required<Player>()
  readonly embedded = input(false)
}
