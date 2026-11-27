import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { PlayerService, PlayerWrapperComponent } from '@platon/feature/player/browser'
import { Player } from '@platon/feature/player/common'
import { UiErrorComponent } from '@platon/shared/ui'
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
export class PlayerPreviewPage implements OnInit {
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
}
