import { Injectable, inject, OnDestroy } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Location } from '@angular/common'
import { AuthService, DialogService } from '@platon/core/browser'
import { User } from '@platon/core/common'
import { AiService } from '@platon/feature/ai/browser'
import { AiChat } from '@platon/feature/ai/common'
import { LayoutState, layoutStateFromError } from '@platon/shared/ui'
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs'
import { ChatMessage, TypingAnimationController } from '@platon/feature/ai/browser'

@Injectable()
export class AiPresenter implements OnDestroy {
  private readonly context = new BehaviorSubject<Context>(this.defaultContext())
  private readonly aiService = inject(AiService)
  private readonly authService = inject(AuthService)
  private readonly dialogService = inject(DialogService)
  private readonly router = inject(Router)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly location = inject(Location)
  private readonly subscriptions: Subscription[] = []

  readonly contextChange = this.context.asObservable()

  constructor() {
    this.init().catch(console.error)
    this.watchRouteChanges()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  defaultContext(): Context {
    return {
      state: 'LOADING',
      chats: [],
      currentChat: null,
      messages: [],
    }
  }

  /**
   * watch and react to route changes (chatId)
   */
  private watchRouteChanges(): void {
    this.subscriptions.push(
      this.activatedRoute.paramMap.subscribe(async (params) => {
        const chatId = params.get('chatId')

        if (chatId && chatId !== this.context.value.currentChat?.id) {
          try {
            const chat = await firstValueFrom(this.aiService.getChatMessages(chatId))
            const messages = chat.messages?.map((m) => ({
              id: m.id,
              text: m.content,
              type: m.role as 'user' | 'ai',
              timestamp: new Date(m.createdAt),
              displayText: m.role === 'ai' ? m.content : undefined,
            }))

            this.updateContext({
              currentChat: chat,
              messages,
            })
          } catch (error) {
            console.error('Erreur lors du chargement du chat:', error)
            void this.router.navigate(['/ai'])
          }
        } else if (!chatId && this.context.value.currentChat) {
          this.updateContext({
            currentChat: null,
            messages: [],
          })
        }
      })
    )
  }

  /**
   * Initialize the presenter and load chat from route if present
   */
  private async init(): Promise<void> {
    try {
      const user = await this.authService.ready()
      const chats = await firstValueFrom(this.aiService.getUserChats())
      this.updateContext({
        state: 'READY',
        user,
        chats,
      })

      // Charger le chat depuis la route si présent
      await this.loadChatFromRoute()
    } catch (error) {
      this.updateContext({ state: layoutStateFromError(error) })
    }
  }

  /**
   * Load chat from route if chatId is present
   */
  async loadChatFromRoute(): Promise<void> {
    const chatId = this.activatedRoute.snapshot.paramMap.get('chatId')
    if (chatId) {
      try {
        // Charger les messages du chat
        const chat = await firstValueFrom(this.aiService.getChatMessages(chatId))
        const messages = chat.messages?.map((m) => ({
          id: m.id,
          text: m.content,
          type: m.role as 'user' | 'ai',
          timestamp: new Date(m.createdAt),
          displayText: m.role === 'ai' ? m.content : undefined, // Initialiser displayText pour les messages AI
        }))

        this.updateContext({
          currentChat: chat,
          messages,
        })
      } catch (error) {
        console.error('Erreur lors du chargement du chat depuis la route:', error)
        // Rediriger vers la page AI sans chat si le chat n'existe pas
        void this.router.navigate(['/ai'])
      }
    }
  }

  /**
   * Create a new chat and navigate to its route
   */
  async createChat(): Promise<AiChat | null> {
    try {
      const newChat = await firstValueFrom(this.aiService.createChat())

      // Ajouter le nouveau chat à la liste
      const updatedChats = [...this.context.value.chats, newChat]

      this.updateContext({
        chats: updatedChats,
        currentChat: newChat,
        messages: [],
      })

      // Naviguer vers la route du nouveau chat
      void this.router.navigate(['/ai/c', newChat.id])

      return newChat
    } catch (error) {
      this.alertError('Erreur lors de la création du chat')
      return null
    }
  }

  /**
   * Select and load a specific chat
   */
  async selectChat(chat: AiChat): Promise<void> {
    try {
      const messages = chat.messages?.map((m) => ({
        id: m.id,
        text: m.content,
        type: m.role as 'user' | 'ai',
        timestamp: new Date(m.createdAt),
        displayText: m.role === 'ai' ? m.content : undefined, // Initialiser displayText pour les messages AI
      }))

      this.updateContext({
        currentChat: chat,
        messages,
      })
    } catch (error) {
      this.alertError('Erreur lors du chargement des messages')
    }
  }

  /**
   * Send a message to the AI and handle the streaming response
   * Use streaming to display the response in real-time with typing animation
   */
  async sendMessage(prompt: string, animationController?: TypingAnimationController): Promise<string | null> {
    let { currentChat } = this.context.value

    if (!currentChat) {
      currentChat = await this.createChatSilently()
      if (!currentChat) {
        return null
      }
    }

    try {
      const userMessage: ChatMessage = {
        id: Date.now().toString() + '_user',
        text: prompt,
        type: 'user',
        timestamp: new Date(),
      }

      const aiMessageId = Date.now().toString() + '_ai'
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        text: '',
        type: 'ai',
        timestamp: new Date(),
        isStreaming: true,
        displayText: '',
      }

      const updatedMessages = [...this.context.value.messages, userMessage, aiMessage]

      this.updateContext({
        messages: updatedMessages,
      })

      let fullResponse = ''

      const streamSubscription = this.aiService.askStream(currentChat.id, prompt).subscribe({
        next: (chunk) => {
          if (chunk.type === 'chunk' && chunk.content) {
            fullResponse += chunk.content

            this.updateMessageWithAnimation(aiMessageId, fullResponse, animationController)
          }
        },
        error: (error) => {
          console.error('Erreur lors du streaming:', error)
          fullResponse = "Désolé, une erreur s'est produite, veuillez réessayer plus tard..."
          this.finalizeMessage(aiMessageId, fullResponse, animationController)
        },
        complete: () => {
          this.finalizeMessage(aiMessageId, fullResponse, animationController)
        },
      })

      this.subscriptions.push(streamSubscription)
      return fullResponse
    } catch (error) {
      this.alertError("Erreur lors de l'envoi du message")
      return null
    }
  }

  /**
   * Update the AI message with the latest full response and trigger typing animation
   */
  private updateMessageWithAnimation(
    messageId: string,
    fullResponse: string,
    animationController?: TypingAnimationController
  ): void {
    const currentMessages = this.context.value.messages
    const aiMessageIndex = currentMessages.findIndex((m) => m.id === messageId)

    if (aiMessageIndex !== -1) {
      const updatedMessages = [...currentMessages]
      updatedMessages[aiMessageIndex] = {
        ...updatedMessages[aiMessageIndex],
        text: fullResponse,
        isStreaming: true,
      }

      this.updateContext({
        messages: updatedMessages,
      })

      animationController?.updateMessageChunk(messageId, fullResponse)
    }
  }

  /**
   * Update the AI message with the final full response and mark it as complete
   */
  private finalizeMessage(
    messageId: string,
    fullResponse: string,
    animationController?: TypingAnimationController
  ): void {
    const currentMessages = this.context.value.messages
    const aiMessageIndex = currentMessages.findIndex((m) => m.id === messageId)

    if (aiMessageIndex !== -1) {
      const updatedMessages = [...currentMessages]
      updatedMessages[aiMessageIndex] = {
        ...updatedMessages[aiMessageIndex],
        text: fullResponse,
        isStreaming: false,
        displayText: fullResponse,
      }

      this.updateContext({
        messages: updatedMessages,
      })
    }

    animationController?.completeMessage(messageId)
  }
  /**
   * Create a new chat silently without navigation
   */
  private async createChatSilently(): Promise<AiChat | null> {
    try {
      const newChat = await firstValueFrom(this.aiService.createChat())

      const updatedChats = [...this.context.value.chats, newChat]

      this.updateContext({
        chats: updatedChats,
        currentChat: newChat,
        messages: [],
      })

      this.location.replaceState(`/ai/c/${newChat.id}`)

      return newChat
    } catch (error) {
      this.alertError('Erreur lors de la création du chat')
      return null
    }
  }

  /**
   * Navigate to a specific chat by its ID
   */
  navigateToChat(chatId: string): void {
    void this.router.navigate(['/ai/c', chatId])
  }

  /**
   * Reset the current chat (new chat) and navigate to the main route
   */
  resetCurrentChat(): void {
    this.updateContext({
      currentChat: null,
      messages: [],
    })
    // Naviguer vers la route principale pour un nouveau chat
    void this.router.navigate(['/ai'])
  }

  /**
   * Update the context with partial changes
   */
  private updateContext(context: Partial<Context>): void {
    const newContext = {
      ...this.context.value,
      ...context,
    }
    this.context.next(newContext)
  }

  /**
   * Show an error message
   */
  private alertError(message: string): void {
    this.dialogService.error(message)
  }
}

export interface Context {
  state: LayoutState
  user?: User
  chats: AiChat[]
  currentChat: AiChat | null
  messages: ChatMessage[]
}
