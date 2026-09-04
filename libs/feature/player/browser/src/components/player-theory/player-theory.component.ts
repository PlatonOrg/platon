import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { type ExerciseTheory } from '@platon/feature/compiler'
import { UiFilePreviewComponent } from '@platon/shared/ui'

@Component({
  selector: 'player-theory',
  templateUrl: './player-theory.component.html',
  styleUrl: './player-theory.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiFilePreviewComponent],
})
export class PlayerTheoryComponent {
  @Input({ required: true }) theory!: ExerciseTheory
}
