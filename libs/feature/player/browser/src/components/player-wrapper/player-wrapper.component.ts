import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { Player } from '@platon/feature/player/common'
import { PlayerActivityComponent } from '../player-activity/player-activity.component'
import { PlayerExerciseComponent } from '../player-exercise/player-exercise.component'

@Component({
  selector: 'player-wrapper',
  templateUrl: './player-wrapper.component.html',
  styleUrls: ['./player-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PlayerExerciseComponent, PlayerActivityComponent],
})
export class PlayerWrapperComponent {
  @Input({ required: true }) player!: Player
}
