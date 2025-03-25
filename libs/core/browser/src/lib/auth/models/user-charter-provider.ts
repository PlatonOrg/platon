import { UserCharter } from '@platon/core/common'
import { Observable } from 'rxjs'

export abstract class UserCharterProvider {
  abstract acceptUserCharter(userId: string): Observable<UserCharter>
  abstract findUserCharterById(userId: string): Observable<UserCharter>
}
