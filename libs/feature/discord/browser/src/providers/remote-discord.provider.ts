import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { DiscordProvider } from '../models/discord-provider'
import { map, Observable } from 'rxjs'
import { ItemResponse } from '@platon/core/common'

@Injectable()
export class RemoteDiscordService extends DiscordProvider {
  private readonly http = inject(HttpClient)

  getInvitationLink(): Observable<string> {
    return this.http.get<ItemResponse<string>>('api/v1/discord/invitation').pipe(map((response) => response.resource))
  }
}
