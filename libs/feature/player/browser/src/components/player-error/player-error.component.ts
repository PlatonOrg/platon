import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatIconModule } from '@angular/material/icon'
import { MatMenu, MatMenuModule } from '@angular/material/menu'

import { ExercisePlayer, LogType, PlatonLog } from '@platon/feature/player/common'

@Component({
  selector: 'player-error',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatExpansionModule,
    MatIconModule,
    MatMenu,
    MatMenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-error.component.html',
  styleUrl: './player-error.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PlayerErrorComponent {
  player = input.required<ExercisePlayer>()
  user = input<{
    firstName?: string | null
    lastName?: string | null
  } | null>(null)
  execRetryExercise = input<() => void | undefined>()
  execGoToNextPlayer = input<() => void | undefined>()
  hasNext = input<boolean | undefined>(undefined)
  editorPreview = input<boolean>(false)
  dismissErrors = output<void>()

  protected onDismissErrors() {
    this.dismissErrors.emit()
  }

  private getErrorLogsFromPlayer(player: ExercisePlayer): PlatonLog[] {
    return player.platon_logs?.filter((log) => log.type === LogType.ERROR) || []
  }

  protected readonly errorServerSignal = computed(() => {
    return this.getErrorLogsFromPlayer(this.player())
      .map((log) => log.message)
      .join('\n')
  })

  protected canGoToNextPlayer() {
    return !this.editorPreview() && this.hasNext() && this.execGoToNextPlayer() !== undefined
  }

  get mailtoLink(): string {
    const subject = encodeURIComponent(`Problème avec l'exercice: ${this.player()?.title || 'Exercice'}`)

    const name =
      this.user()?.firstName && this.user()?.lastName
        ? `${this.user()?.firstName} ${this.user()?.lastName}`
        : '[PRENOM] [NOM]'

    const body = encodeURIComponent(`
    Bonjour,

    J'ai rencontré un problème avec l'exercice "${this.player()?.title || 'Exercice'}" dans PLaTon.

    Détails de l'erreur:
    ${this.errorServerSignal()}

    Pourriez-vous m'aider à résoudre ce problème ?

    Merci,
    ${name}
    `)

    return `mailto:${this.getTeacherEmail()}?subject=${subject}&body=${body}`
  }

  private getTeacherEmail(): string {
    return ''
  }
}
