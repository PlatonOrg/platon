/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  inject,
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

import { SafePipe } from '@cisstech/nge/pipes'

import { DialogModule, DialogService, UserAvatarComponent } from '@platon/core/browser'
import { ExercisePlayer, PlayerActions, PlayerNavigation } from '@platon/feature/player/common'

import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute } from '@angular/router'
import { ExerciseTheory } from '@platon/feature/compiler'
import { AnswerStatePipesModule } from '@platon/feature/result/browser'
import { AnswerStates } from '@platon/feature/result/common'
import { WebComponentService } from '@platon/feature/webcomponent'
import {
  FilePreviewSupportedPipe,
  IsUUIDPipe,
  UiModalDrawerComponent,
  UiModalTemplateComponent,
} from '@platon/shared/ui'
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzStatisticModule } from 'ng-zorro-antd/statistic'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { PlayerService } from '../../api/player.service'
import { PLAYER_EDITOR_PREVIEW } from '../../models/player.model'
import { PlayerTheoryComponent } from '../player-theory/player-theory.component'
import { NzTabsModule } from 'ng-zorro-antd/tabs'
import { NzEmptyModule } from 'ng-zorro-antd/empty'

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
  standalone: true,
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
    NzToolTipModule,
    NzSkeletonModule,
    NzStatisticModule,
    NzTabsModule,
    NzEmptyModule,

    SafePipe,
    IsUUIDPipe,
    DialogModule,
    UserAvatarComponent,
    NgeMarkdownModule,
    UiModalDrawerComponent,
    UiModalTemplateComponent,
    PlayerTheoryComponent,
    FilePreviewSupportedPipe,
    AnswerStatePipesModule,
  ],
})
export class PlayerReviewComponent implements OnInit, OnDestroy, OnChanges {
  private readonly subscriptions: Subscription[] = []
  private readonly dialogService = inject(DialogService)
  private readonly playerService = inject(PlayerService)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly webComponentService = inject(WebComponentService)

  @Input() state?: AnswerStates
  @Input() player?: ExercisePlayer
  @Input() players: ExercisePlayer[] = []

  @Input() reviewMode = true
  @Input() canComment = false

  @Input() hasNext?: boolean
  @Input() hasPrev?: boolean

  @Input() countdownValue?: number | null
  @Input() countdownColor?: string | null

  @Output() evaluated = new EventEmitter<PlayerNavigation>()
  @Output() goToPrevPlayer = new EventEmitter<void>()
  @Output() goToNextPlayer = new EventEmitter<void>()

  @ViewChild('container', { read: ElementRef, static: true })
  protected container!: ElementRef<FullscreenElement>

  @ViewChild('errorTemplate', { read: TemplateRef, static: true })
  protected errorTemplate!: TemplateRef<object>

  @ViewChild('containerFeedbacks', { read: ElementRef })
  protected containerFeedbacks!: ElementRef<HTMLElement>

  @ViewChild('containerHints', { read: ElementRef })
  protected containerHints!: ElementRef<HTMLElement>

  @ViewChild('containerSolution', { read: ElementRef })
  protected containerSolution!: ElementRef<HTMLElement>

  @ViewChild('theories')
  protected theoriesMenu!: MatMenu

  protected index = 0
  protected loading = true
  protected fullscreen = false
  protected selectedTheory?: ExerciseTheory
  protected runningAction?: PlayerActions

  protected get primaryActions(): Action[] {
    if (!this.player) return []
    return [
      {
        id: 'check-answer-button',
        icon: 'check',
        label: this.player.remainingAttempts ? `Évaluer (${this.player.remainingAttempts})` : 'Évaluer',
        tooltip: 'Valider',
        color: 'primary',
        danger: this.player.remainingAttempts === 1,
        visible: !this.reviewMode,
        disabled: this.disabled || !!this.runningAction,
        playerAction: PlayerActions.CHECK_ANSWER,
        showLabel: !!this.player.remainingAttempts,
        run: async () => {
          this.removeAnswerFromLocalStorage()
          await this.evaluate(PlayerActions.CHECK_ANSWER)
          this.scrollIntoNode(this.containerFeedbacks?.nativeElement, 'center')
        },
      },
      {
        icon: 'refresh',
        label: 'Autre question',
        tooltip: 'Autre question',
        disabled: !!this.runningAction,
        visible: !this.reviewMode && !!this.player.settings?.actions?.reroll,
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
  }

  private async downloadEnvironment(): Promise<void> {
    window.open(`/api/v1/player/environment/${this.player?.sessionId}`, '_blank')
  }

  protected get secondaryActions(): Action[] {
    if (!this.player) return []
    return [
      {
        icon: 'menu_book',
        label: 'Théorie',
        tooltip: 'Théorie',
        menu: this.theoriesMenu,
        visible: !!this.player.theories?.length,
      },
      {
        icon: 'key',
        label: 'Solution',
        tooltip: 'Solution',
        visible: this.player.settings?.actions?.solution && !this.player.solution,
        disabled: this.disabled || !!this.runningAction,
        playerAction: PlayerActions.SHOW_SOLUTION,
        run: async () => {
          await this.evaluate(PlayerActions.SHOW_SOLUTION)
          this.scrollIntoNode(this.containerSolution?.nativeElement, 'start')
        },
      },
      {
        icon: 'lightbulb',
        label: 'Aide',
        tooltip: 'Aide',
        visible: this.player.settings?.actions?.hints && !!this.player.hints,
        disabled: this.disabled || !!this.runningAction,
        playerAction: PlayerActions.NEXT_HINT,
        run: async () => {
          await this.evaluate(PlayerActions.NEXT_HINT)
          this.scrollIntoNode(this.containerHints?.nativeElement, 'center')
        },
      },
    ]
  }

  protected get navigationActions(): Action[] {
    if (!this.player) return []
    return [
      {
        icon: 'arrow_back',
        label: 'Exercise précédent',
        tooltip: 'Exercise précédent',
        visible: this.hasPrev,
        id: 'prev-exercise-button',
        run: () => this.showConfirmModalIfAnswered(this.goToPrevPlayer),
      },
      {
        icon: 'arrow_forward',
        label: 'Exercise suivant',
        tooltip: 'Exercise suivant',
        visible: this.hasNext,
        id: 'next-exercise-button',
        run: () => this.showConfirmModalIfAnswered(this.goToNextPlayer),
      },
    ]
  }

  protected get reviewModeActions(): Action[] {
    if (!this.player) return []
    return [
      {
        icon: 'arrow_back',
        label: 'Réponse précédente',
        tooltip: 'Réponse précédente',
        visible: this.players.length > 1,
        disabled: this.players.length > 1 && this.index == 0,
        run: () => this.previousAttempt(),
      },
      {
        icon: 'arrow_forward',
        label: 'Réponse suivante',
        tooltip: 'Réponse suivante',
        visible: this.players.length > 1,
        disabled: this.players.length > 1 && this.index == this.players.length - 1,
        run: () => this.nextAttempt(),
      },
    ]
  }

  protected clearNotification?: () => void
  protected requestFullscreen?: () => void

  protected get disabled(): boolean {
    if (!this.player) return true
    return !!this.player.solution || (this.player.remainingAttempts != null && this.player.remainingAttempts <= 0)
  }

  get currentAttemptIndex(): number {
    return this.index
  }

  get canRequestFullscreen(): boolean {
    return !!this.requestFullscreen && this.activatedRoute.snapshot.queryParamMap.has(PLAYER_EDITOR_PREVIEW)
  }

  // Function called before the user goes to next/previous exercise
  private async showConfirmModalIfAnswered(callback: EventEmitter<void>): Promise<void> {
    let hasAnswered = false
    this.forEachComponent((component) => {
      if (component.state?.isFilled) {
        hasAnswered = true
      }
    })
    if (!hasAnswered) {
      console.log('prout')
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

  ngOnInit(): void {
    this.index = this.players.length - 1
    this.player = this.players[this.index]
    this.requestFullscreen =
      this.container.nativeElement.requestFullscreen ||
      this.container.nativeElement.webkitRequestFullscreen ||
      this.container.nativeElement.mozRequestFullScreen ||
      this.container.nativeElement.msRequestFullscreen

    this.subscriptions.push(
      this.webComponentService.onSubmit.subscribe((id: string) => {
        const component = this.container.nativeElement.querySelector(`[id="${id}"]`)
        if (component) {
          this.evaluate(PlayerActions.CHECK_ANSWER).catch(console.error)
        }
      })
    )
    this.changeDetectorRef.markForCheck()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  ngOnChanges(): void {
    if (this.players?.length) {
      this.index = this.reviewMode ? this.players.length - 1 : 0
      this.player = this.players[this.index]
      this.clearNotification?.()
      this.clearNotification = undefined
    } else {
      this.player = undefined
    }
  }

  protected previousAttempt(): void {
    this.player = this.players[--this.index]
    this.changeDetectorRef.markForCheck()
  }

  protected nextAttempt(): void {
    this.player = this.players[++this.index]
    this.changeDetectorRef.markForCheck()
  }

  protected onRender(): void {
    this.loading = false
    this.changeDetectorRef.markForCheck()
  }

  protected async toggleFullscreen(): Promise<void> {
    if (this.fullscreen) {
      this.fullscreen = false
      const element = document as unknown as FullscreenElement
      element.exitFullscreen?.() ||
        element.webkitExitFullscreen?.() ||
        element.mozCancelFullScreen?.() ||
        element.msExitFullscreen?.()
    } else {
      this.fullscreen = true
      const element = this.container.nativeElement
      element.requestFullscreen?.() ||
        element.webkitRequestFullscreen?.() ||
        element.mozRequestFullScreen?.() ||
        element.msRequestFullscreen?.()
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
    const form = this.container.nativeElement.querySelector('#form')
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
    if (!this.disabled) {
      await this.evaluate(PlayerActions.CHECK_ANSWER)
    }
  }

  private async evaluate(action: PlayerActions): Promise<void> {
    if (!this.player) return

    try {
      this.runningAction = action
      this.changeDetectorRef.markForCheck()

      this.clearNotification?.()
      this.clearNotification = undefined

      const answers = this.answers()

      const output = await firstValueFrom(
        this.playerService.evaluate({
          answers,
          action,
          sessionId: this.player.sessionId,
        })
      )

      this.player = output.exercise

      // little hack here to nge-markdown component to detect change in the case where theses
      // values are not modified during the evaluation on the server side
      const markdowns = ['form' as const, 'statement' as const, 'solution' as const]
      markdowns.forEach((key) => {
        if (this.player?.[key]) {
          this.player[key] += '\n'
        }
      })

      this.player.form = this.player.form + ''
      if (output.navigation) {
        this.evaluated.emit(output.navigation)
      }

      if (!this.player.feedbacks?.length && action === PlayerActions.CHECK_ANSWER) {
        this.dialogService.info('Votre réponse a bien été prise en compte.')
      }
    } catch (error) {
      let message = 'Une erreur est survenue lors de cette action.'
      if (error instanceof HttpErrorResponse) {
        message = error.error?.message || error.message || message
      }

      this.clearNotification = this.dialogService.notification(this.errorTemplate, {
        duration: 0,
        data: { message },
      })
    } finally {
      this.runningAction = undefined
      this.changeDetectorRef.markForCheck()
    }
  }
}
