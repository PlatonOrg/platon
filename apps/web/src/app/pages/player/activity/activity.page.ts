import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { NzSpinModule } from 'ng-zorro-antd/spin'

import { PlayerService, PlayerWrapperComponent } from '@platon/feature/player/browser'
import { Player } from '@platon/feature/player/common'
import { UiErrorComponent } from '@platon/shared/ui'

@Component({
  selector: 'app-player-activity',
  templateUrl: './activity.page.html',
  styleUrls: ['./activity.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzSpinModule, UiErrorComponent, PlayerWrapperComponent],
})
export class PlayerActivityPage implements OnInit {
  private readonly playerService = inject(PlayerService)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected player?: Player
  protected loading = true
  protected error: unknown

  async ngOnInit(): Promise<void> {
    try {
      const params = this.activatedRoute.snapshot.paramMap
      const activityId = params.get('id') as string
      const output = await firstValueFrom(this.playerService.playActivity({ activityId }))
      this.player = output.activity
    } catch (error) {
      this.error = error
    } finally {
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }
  }
}
