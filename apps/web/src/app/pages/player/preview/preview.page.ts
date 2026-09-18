import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { PlayerService, PlayerWrapperComponent } from '@platon/feature/player/browser'
import { Player } from '@platon/feature/player/common'
import { EXERCISE_PREVIEW_RESIZE, UiErrorComponent } from '@platon/shared/ui'
import { NzSpinModule } from 'ng-zorro-antd/spin'

import { AuthService, StorageService } from '@platon/core/browser'
import { Variables } from '@platon/feature/compiler'
import { getPreviewOverridesStorageKey } from '@platon/feature/resource/browser'

@Component({
  selector: 'app-player-preview',
  templateUrl: './preview.page.html',
  styleUrls: ['./preview.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzSpinModule, UiErrorComponent, PlayerWrapperComponent],
})
export class PlayerPreviewPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly playerService = inject(PlayerService)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly storageService = inject(StorageService)
  private readonly authService = inject(AuthService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected player?: Player
  protected loading = true
  protected error?: unknown

  private sessionId?: string
  private isFromBuilder = false
  private autoResize = false
  private resizeObserver?: ResizeObserver
  private mutationObserver?: MutationObserver
  private reportHeight?: () => void
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef)

  async ngOnInit(): Promise<void> {
    try {
      const params = this.activatedRoute.snapshot.paramMap
      const queryParams = this.activatedRoute.snapshot.queryParamMap

      const id = params.get('id')
      const version = queryParams.get('version')
      const sessionId = queryParams.get('sessionId')
      const accessToken = queryParams.get('accessToken')
      const refreshToken = queryParams.get('refreshToken')
      this.sessionId = sessionId || undefined
      this.isFromBuilder = queryParams.get('fromBuilder') === 'true'
      this.autoResize = queryParams.get('autoResize') === 'true'

      if (accessToken && refreshToken) {
        // used for preview in vscode
        await this.authService.signInWithToken({ accessToken, refreshToken })
      }

      let overrides: Variables | undefined
      if (sessionId) {
        overrides = JSON.parse(
          (await firstValueFrom(this.storageService.getString(getPreviewOverridesStorageKey(sessionId)))) || '{}'
        )
      }

      const output = await firstValueFrom(
        this.playerService.preview({
          resource: id as string,
          version: version as string,
          overrides,
        })
      )
      this.player = output.activity || output.exercise
    } catch (error) {
      this.error = error
    } finally {
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }

    this.loading = false
    this.changeDetectorRef.markForCheck()
  }

  @HostListener('window:beforeunload')
  protected async onClose() {
    // Only clean up if NOT from builder
    if (this.sessionId && !this.isFromBuilder) {
      await firstValueFrom(this.storageService.remove(getPreviewOverridesStorageKey(this.sessionId)))
    }
  }

  ngAfterViewInit(): void {
    if (window === window.parent || !this.autoResize) {
      return
    }

    // Désactive le conteneur plein-écran à scroll interne (player-wrapper) : sinon on mesure en
    // boucle "la taille actuelle de l'iframe" plutôt que la taille naturelle du contenu (voir
    // preview.page.scss).
    this.elementRef.nativeElement.classList.add('embedded')

    const reportHeight = (this.reportHeight = () => {
      window.parent.postMessage({ type: EXERCISE_PREVIEW_RESIZE, height: document.documentElement.scrollHeight }, '*')
    })

    this.resizeObserver = new ResizeObserver(reportHeight)
    this.resizeObserver.observe(this.elementRef.nativeElement)
    reportHeight()

    window.addEventListener('load', reportHeight)

    this.mutationObserver = new MutationObserver(reportHeight)
    this.mutationObserver.observe(document.body, { childList: true, subtree: true })
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
    this.mutationObserver?.disconnect()
    if (this.reportHeight) {
      window.removeEventListener('load', this.reportHeight)
    }
  }
}
