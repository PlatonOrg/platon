import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { DiscordService } from '../../api/discord.service'
import { firstValueFrom } from 'rxjs'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'

import { UiError500Component } from '@platon/shared/ui'

@Component({
  selector: 'discord-invitation',
  templateUrl: './discord-invitation.component.html',
  styleUrls: ['./discord-invitation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgeMarkdownModule, UiError500Component],
})
export class DiscordInvitationComponent implements OnInit {
  private readonly discordService = inject(DiscordService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected url?: string
  protected error = false

  async ngOnInit(): Promise<void> {
    this.resetGif()
    try {
      this.url = await firstValueFrom(this.discordService.getInvitationLink())
    } catch (_error) {
      this.error = true
    }
    this.changeDetectorRef.markForCheck()
  }

  protected resetGif(): void {
    const img = document.getElementById('DiscordGif') as HTMLImageElement | null
    if (img) {
      const imageUrl = img.src
      img.src = ''
      img.src = imageUrl
    }
  }

  protected openUrl(): void {
    console.error('openUrl')
    if (this.url) {
      window.open(this.url, '_blank')
    }
  }
}
