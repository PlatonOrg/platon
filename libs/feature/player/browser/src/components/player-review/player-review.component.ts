/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { CommonModule } from '@angular/common'
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  OnInit,
  OutputEmitterRef,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core'
import { Subscription, firstValueFrom } from 'rxjs'

import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatIconModule } from '@angular/material/icon'
import { MatMenu, MatMenuModule } from '@angular/material/menu'

import { NgeMarkdownModule } from '@cisstech/nge/markdown'

import { NzAlertModule } from 'ng-zorro-antd/alert'

import { DialogModule, DialogService, UserAvatarComponent } from '@platon/core/browser'
import { ExercisePlayer, LogType, PlatonLog, PlayerActions, PlayerNavigation } from '@platon/feature/player/common'

import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute } from '@angular/router'
import { ExerciseFeedback, ExerciseTheory } from '@platon/feature/compiler'
import { AnswerStatePipesModule } from '@platon/feature/result/browser'
import { AnswerStates } from '@platon/feature/result/common'
import { WebComponentService } from '@platon/feature/webcomponent'
import { IsUUIDPipe } from '@platon/shared/ui'
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzStatisticModule } from 'ng-zorro-antd/statistic'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { PlayerService } from '../../api/player.service'
import { PLAYER_EDITOR_PREVIEW } from '../../models/player.model'
import { PlayerErrorComponent } from '../player-error/player-error.component'
import { NzTabsModule } from 'ng-zorro-antd/tabs'
import { NzNotificationComponent } from 'ng-zorro-antd/notification'

type Action = {
  id?: string
  icon: string
  label: string
  color?: string
  danger?: boolean
  tooltip: string
  visible?: boolean
  disabled?: boolean
  showLabel?: boolean
  playerAction?: PlayerActions
  menu?: MatMenu
  run?: () => void
}

type FullscreenElement = HTMLElement & {
  requestFullscreen?: () => Promise<void>
  webkitRequestFullscreen?: () => Promise<void>
  mozRequestFullScreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
  exitFullscreen?: () => Promise<void>
  webkitExitFullscreen?: () => Promise<void>
  mozCancelFullScreen?: () => Promise<void>
  msExitFullscreen?: () => Promise<void>
}

@Component({
  selector: 'player-review',
  templateUrl: './player-review.component.html',
  styleUrls: ['./player-review.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatCardModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule,
    NzSpinModule,
    NzAlertModule,
    NzTooltipModule,
    NzSkeletonModule,
    NzStatisticModule,
    NzTabsModule,
    IsUUIDPipe,
    DialogModule,
    UserAvatarComponent,
    NgeMarkdownModule,
    PlayerErrorComponent,
    AnswerStatePipesModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PlayerReviewComponent implements OnInit, OnDestroy, OnChanges {
  private readonly subscriptions: Subscription[] = []
  private readonly dialogService = inject(DialogService)
  private readonly playerService = inject(PlayerService)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly webComponentService = inject(WebComponentService)

  readonly state = input<AnswerStates>()
  readonly players = input<ExercisePlayer[]>([])

  readonly reviewMode = input<boolean>(true)
  readonly canComment = input<boolean>(false)

  readonly hasNext = input<boolean>()
  readonly hasPrev = input<boolean>()

  readonly countdownValue = input<number | null>()
  readonly countdownColor = input<string | null>()

  readonly evaluated = output<PlayerNavigation>()
  readonly goToPrevPlayer = output<void>()
  readonly goToNextPlayer = output<void>()

  protected readonly container = viewChild.required<ElementRef<FullscreenElement>, ElementRef<FullscreenElement>>(
    'container',
    { read: ElementRef }
  )
  protected readonly errorTemplate =
    viewChild.required<TemplateRef<{ $implicit: NzNotificationComponent; data: any }>>('errorTemplate')
  protected readonly containerFeedbacks = viewChild<ElementRef<HTMLElement>>('containerFeedbacks')
  protected readonly containerHints = viewChild<ElementRef<HTMLElement>>('containerHints')
  protected readonly containerSolution = viewChild<ElementRef<HTMLElement>>('containerSolution')
  protected readonly theoriesMenu = viewChild<MatMenu>('theories')

  protected readonly player = signal<ExercisePlayer | undefined>(undefined)
  protected readonly errorsDismissed = signal(false)

  protected readonly index = signal(0)
  protected readonly loading = signal(true)
  protected readonly fullscreen = signal(false)
  protected readonly selectedTheory = signal<ExerciseTheory | undefined>(undefined)
  protected readonly runningAction = signal<PlayerActions | undefined>(undefined)
  protected readonly requestFullscreen = signal<(() => Promise<void>) | undefined>(undefined)

  protected clearNotification?: () => void

  protected readonly primaryActions = computed<Action[]>(() => {
    const player = this.player()
    if (!player) return []
    return [
      {
        id: 'check-answer-button',
        icon: 'check',
        label: player.remainingAttempts ? `Évaluer (${player.remainingAttempts})` : 'Évaluer',
        tooltip: 'Valider',
        color: 'primary',
        danger: player.remainingAttempts === 1,
        visible: !this.reviewMode(),
        disabled: this.disabled() || !!this.runningAction(),
        playerAction: PlayerActions.CHECK_ANSWER,
        showLabel: !!player.remainingAttempts,
        run: async () => {
          this.removeAnswerFromLocalStorage()
          await this.evaluate(PlayerActions.CHECK_ANSWER)
          this.scrollIntoNode(this.containerFeedbacks()?.nativeElement, 'center')
        },
      },
      {
        icon: 'refresh',
        label: 'Autre question',
        tooltip: 'Autre question',
        disabled: !!this.runningAction(),
        visible: !this.reviewMode() && !!player.settings?.actions?.reroll,
        playerAction: PlayerActions.REROLL_EXERCISE,
        run: () => this.evaluate(PlayerActions.REROLL_EXERCISE),
      },
      {
        icon: 'download',
        label: "Télécharger l'environnement",
        tooltip: "Télécharger l'environnement",
        visible: this.activatedRoute.snapshot.queryParamMap.has(PLAYER_EDITOR_PREVIEW),
        run: () => this.downloadEnvironment(),
      },
    ]
  })

  private async downloadEnvironment(): Promise<void> {
    window.open(`/api/v1/player/environment/${this.player()?.sessionId}`, '_blank')
  }

  protected readonly secondaryActions = computed<Action[]>(() => {
    const player = this.player()
    if (!player) return []
    return [
      {
        icon: 'menu_book',
        label: 'Théorie',
        tooltip: 'Théorie',
        menu: this.theoriesMenu(),
        visible: !!player.theories?.length,
      },
      {
        icon: 'key',
        label: 'Solution',
        tooltip: 'Solution',
        visible: player.settings?.actions?.solution && !player.solution,
        disabled: this.disabled() || !!this.runningAction(),
        playerAction: PlayerActions.SHOW_SOLUTION,
        run: async () => {
          await this.evaluate(PlayerActions.SHOW_SOLUTION)
          this.scrollIntoNode(this.containerSolution()?.nativeElement, 'start')
        },
      },
      {
        icon: 'lightbulb',
        label: 'Aide',
        tooltip: 'Aide',
        visible: player.settings?.actions?.hints && !!player.hints,
        disabled: this.disabled() || !!this.runningAction(),
        playerAction: PlayerActions.NEXT_HINT,
        run: async () => {
          await this.evaluate(PlayerActions.NEXT_HINT)
          this.scrollIntoNode(this.containerHints()?.nativeElement, 'center')
        },
      },
    ]
  })

  protected readonly navigationActions = computed<Action[]>(() => {
    if (!this.player()) return []
    return [
      {
        icon: 'arrow_back',
        label: 'Exercice précédent',
        tooltip: 'Exercice précédent',
        visible: this.hasPrev(),
        id: 'prev-exercise-button',
        run: () => this.showConfirmModalIfAnswered(this.goToPrevPlayer),
      },
      {
        icon: 'arrow_forward',
        label: 'Exercice suivant',
        tooltip: 'Exercice suivant',
        visible: this.hasNext(),
        id: 'next-exercise-button',
        run: () => this.showConfirmModalIfAnswered(this.goToNextPlayer),
      },
    ]
  })

  protected readonly reviewModeActions = computed<Action[]>(() => {
    if (!this.player()) return []
    const players = this.players()
    const index = this.index()
    return [
      {
        icon: 'arrow_back',
        label: 'Réponse précédente',
        tooltip: 'Réponse précédente',
        visible: players.length > 1,
        disabled: players.length > 1 && index == 0,
        run: () => this.previousAttempt(),
      },
      {
        icon: 'arrow_forward',
        label: 'Réponse suivante',
        tooltip: 'Réponse suivante',
        visible: players.length > 1,
        disabled: players.length > 1 && index == players.length - 1,
        run: () => this.nextAttempt(),
      },
    ]
  })

  protected readonly disabled = computed(() => {
    const player = this.player()
    if (!player) return true
    return !!player.solution || (player.remainingAttempts != null && player.remainingAttempts <= 0)
  })

  protected readonly currentAttemptIndex = computed(() => this.index())

  protected readonly canRequestFullscreen = computed(() => {
    return !!this.requestFullscreen() && this.activatedRoute.snapshot.queryParamMap.has(PLAYER_EDITOR_PREVIEW)
  })

  protected get editorPreview(): boolean {
    return this.activatedRoute.snapshot.queryParamMap.has(PLAYER_EDITOR_PREVIEW)
  }

  protected readonly hasErrorLogs = computed(() => {
    const player = this.player()
    if (!player) return false
    return !this.editorPreview && this.getErrorLogsFromPlayer(player).length > 0
  })

  protected readonly errorBannerMessage = computed(() => {
    return this.player()?.answerId
      ? "L'étudiant a soumis une réponse, mais une erreur est survenue lors de l'évaluation de cet exercice."
      : "L'étudiant n'a pas pu soumettre de réponse : l'exercice a rencontré une erreur lors de son exécution."
  })

  protected readonly hasErrors = computed(() => {
    if (this.errorsDismissed()) return false
    return this.hasErrorLogs()
  })

  protected readonly contentLoading = computed(() => this.loading() && !this.hasErrors())

  protected dismissErrors(): void {
    this.errorsDismissed.set(true)
  }

  private getErrorLogsFromPlayer(player: ExercisePlayer): PlatonLog[] {
    return player.platon_logs?.filter((log) => log.type === LogType.ERROR) || []
  }

  // Function called before the user goes to next/previous exercise
  private async showConfirmModalIfAnswered(callback: OutputEmitterRef<void>): Promise<void> {
    let hasAnswered = false
    this.forEachComponent((component) => {
      if (component.state?.isFilled) {
        hasAnswered = true
      }
    })
    if (!hasAnswered) {
      callback.emit()
      return
    }

    const confirmed = await this.dialogService.confirm({
      nzTitle: 'Attention',
      nzContent: `
      Vous avez commencé à répondre à cet exercice, êtes-vous sûr de vouloir changer d'exercice ?
      <br/>
      <i>Si vous continuez, votre travail sera sauvegardé sur votre appareil mais vos réponses ne seront pas envoyées à PLaTon.</i>
      `,
      nzOkText: 'Oui',
      nzCancelText: 'Non',
    })
    if (confirmed) {
      callback.emit()
    }
  }

  ngOnChanges(): void {
    const players = this.players()
    if (players.length) {
      const index = this.reviewMode() ? players.length - 1 : 0
      this.index.set(index)
      this.player.set(players[index])
      this.errorsDismissed.set(false)
      this.clearNotification?.()
      this.clearNotification = undefined
    } else {
      this.player.set(undefined)
    }
  }

  ngOnInit(): void {
    this.requestFullscreen.set(
      this.container().nativeElement.requestFullscreen ||
        this.container().nativeElement.webkitRequestFullscreen ||
        this.container().nativeElement.mozRequestFullScreen ||
        this.container().nativeElement.msRequestFullscreen
    )

    this.subscriptions.push(
      this.webComponentService.onSubmit.subscribe((id: string) => {
        const component = this.container().nativeElement.querySelector(`[id="${id}"]`)
        if (component) {
          this.evaluate(PlayerActions.CHECK_ANSWER).catch(console.error)
        }
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected previousAttempt(): void {
    this.index.update((i) => i - 1)
    this.player.set(this.players()[this.index()])
    this.errorsDismissed.set(false)
  }

  protected nextAttempt(): void {
    this.index.update((i) => i + 1)
    this.player.set(this.players()[this.index()])
    this.errorsDismissed.set(false)
  }

  protected onRender(): void {
    this.loading.set(false)
  }

  protected async toggleFullscreen(): Promise<void> {
    if (this.fullscreen()) {
      this.fullscreen.set(false)
      const element = document as unknown as FullscreenElement
      const exitFullscreenFunc =
        element.exitFullscreen ||
        element.webkitExitFullscreen ||
        element.mozCancelFullScreen ||
        element.msExitFullscreen
      await exitFullscreenFunc?.()
    } else {
      this.fullscreen.set(true)
      const element = this.container().nativeElement
      const requestFullscreenFunc =
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen
      await requestFullscreenFunc?.()
    }
  }

  protected trackTheory(_: number, item: ExerciseTheory): string {
    return item.url
  }

  protected trackAction(_: number, item: Action): string {
    return item.tooltip
  }

  public getAnswers(): Record<string, unknown> {
    return this.answers()
  }

  private removeAnswerFromLocalStorage(): void {
    this.forEachComponent((component) => {
      sessionStorage.removeItem('component-' + component.getAttribute('cid'))
    })
  }

  private answers(): Record<string, unknown> {
    const answers: Record<string, unknown> = {}
    this.forEachComponent((component) => {
      answers[component.state.cid] = Object.assign({}, component.state)
    })
    return answers
  }

  private forEachComponent(consumer: (component: any) => void): void {
    const form = this.container().nativeElement.querySelector('#form')
    if (form) {
      form.querySelectorAll('[cid]').forEach((node) => {
        consumer(node as any)
      })
    }
  }

  private scrollIntoNode(node?: HTMLElement, position: ScrollLogicalPosition = 'start'): void {
    if (!node) return
    setTimeout(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: position,
      })
      node.classList.add('animate')
      setTimeout(() => {
        node.classList.remove('animate')
      }, 500)
    })
  }

  public async evaluateFromActivity(): Promise<void> {
    if (!this.disabled()) {
      await this.evaluate(PlayerActions.CHECK_ANSWER)
    }
  }

  private async evaluate(action: PlayerActions): Promise<void> {
    const player = this.player()
    if (!player) return

    try {
      this.runningAction.set(action)

      this.clearNotification?.()
      this.clearNotification = undefined

      const answers = this.answers()

      const output = await firstValueFrom(
        this.playerService.evaluate({
          answers,
          action,
          sessionId: player.sessionId,
        })
      )

      const updatedPlayer = output.exercise

      // little hack here to nge-markdown component to detect change in the case where theses
      // values are not modified during the evaluation on the server side
      const markdowns = ['form' as const, 'statement' as const, 'solution' as const]
      markdowns.forEach((key) => {
        if (updatedPlayer[key]) {
          updatedPlayer[key] += '\n'
        }
      })

      updatedPlayer.form = updatedPlayer.form + ''
      this.player.set(updatedPlayer)
      this.errorsDismissed.set(false)

      if (output.navigation) {
        this.evaluated.emit(output.navigation)
      }

      if (!updatedPlayer.feedbacks?.length && action === PlayerActions.CHECK_ANSWER) {
        this.dialogService.info('Votre réponse a bien été prise en compte.')
      }
    } catch (error) {
      let message = 'Une erreur est survenue lors de cette action.'
      if (error instanceof HttpErrorResponse) {
        message = error.error?.message || error.message || message
      }

      this.clearNotification = this.dialogService.notification(this.errorTemplate(), {
        duration: 0,
        data: { message },
      })
    } finally {
      this.runningAction.set(undefined)
    }
  }

  protected isFeedbackContentAnObject(feedback: ExerciseFeedback): boolean {
    return typeof feedback.content !== 'string'
  }
}
