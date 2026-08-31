import { Injectable, inject } from '@angular/core'
import { DiscordProvider } from '../models/discord-provider'
import { Observable } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class DiscordService {
  private readonly provider = inject(DiscordProvider)

  getInvitationLink(): Observable<string> {
    return this.provider.getInvitationLink()
  }
}
