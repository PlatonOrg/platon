import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core'
import { MainChatComponent } from '@platon/feature/ai/browser'
import { Subscription } from 'rxjs'
import { AiPresenter } from './ai.presenter'
import { DialogModule } from '@platon/core/browser'

@Component({
  standalone: true,
  selector: 'app-ai',
  templateUrl: './ai.page.html',
  styleUrls: ['./ai.page.scss'],
  imports: [CommonModule, MainChatComponent, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AiPresenter],
})
export class AiPage implements OnInit, OnDestroy {
  @ViewChild(MainChatComponent) chatComponent!: MainChatComponent

  private readonly subscriptions: Subscription[] = []
  private readonly presenter = inject(AiPresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected context = this.presenter.defaultContext()

  ngOnInit(): void {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.changeDetectorRef.markForCheck()
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  /**
   * Gérer l'envoi d'un message
   */
  async onSendMessage(message: string): Promise<void> {
    // Passer le contrôleur d'animation au presenter
    await this.presenter.sendMessage(message, this.chatComponent)
    this.changeDetectorRef.markForCheck()
  }

  /**
   * Démarrer un nouveau chat
   */
  async onStartNewChat(): Promise<void> {
    this.presenter.resetCurrentChat()
    this.changeDetectorRef.markForCheck()
  }
}
