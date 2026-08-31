import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { PeerComparisonTreeOutput } from '@platon/feature/peer/common'
import { map, Observable } from 'rxjs'
import { PeerProvider } from '../models/peer-provider'
import { ItemResponse } from '@platon/core/common'

@Injectable()
export class RemotePeerProvider extends PeerProvider {
  private readonly http = inject(HttpClient)

  getTree(activityId: string): Observable<PeerComparisonTreeOutput> {
    return this.http
      .get<ItemResponse<PeerComparisonTreeOutput>>(`/api/v1/peerMatch/activity/${activityId}`)
      .pipe(map((response) => response.resource))
  }
}
