import { ComponentType } from '@angular/cdk/portal'

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  InjectionToken,
  Injector,
  Input,
  OnInit,
} from '@angular/core'
import { AuthService, UserAvatarComponent } from '@platon/core/browser'
import { NOTIFICATION } from '@platon/feature/notification/browser'
import { Notification } from '@platon/feature/notification/common'
import {
  ResourceCreateEvent,
  type ResourceEvent,
  ResourceEventNotification,
  ResourceMemberCreateEvent,
  ResourceMemberRemoveEvent,
  ResourceStatusChangeEvent,
} from '@platon/feature/resource/common'
import { NzEmptyModule } from 'ng-zorro-antd/empty'
import { NzTimelineModule } from 'ng-zorro-antd/timeline'
import { ResourcePipesModule } from '../../pipes'
import { DatePipe, NgComponentOutlet } from '@angular/common'

const ResourceEventToken = new InjectionToken<ResourceEvent>('ResourceEventToken')

@Component({
  selector: 'resource-event-member-remove',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserAvatarComponent],
  template: `
    @if (isMe) { Vous êtes désormais membre de “{{ event.data.resourceName }}” } @if (!isMe && !isJoinRequest) {
    <user-avatar showUsername="inline" [userIdOrName]="event.data.userId" />
    est désormais membre de “{{ event.data.resourceName }}” } @if (isJoinRequest) {
    <user-avatar showUsername="inline" [userIdOrName]="event.data.userId" />
    souhaite rejoindre le cercle “{{ event.data.resourceName }}” }
    <ng-template #avatar>
      <user-avatar showUsername="inline" [userIdOrName]="event.data.userId" />
      est désormais membre de “{{ event.data.resourceName }}”
    </ng-template>
  `,
})
class MemberCreateEventComponent implements OnInit {
  private readonly auth = inject(AuthService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected isMe = false
  protected isJoinRequest = false
  protected event = inject(ResourceEventToken) as ResourceMemberCreateEvent

  async ngOnInit(): Promise<void> {
    const user = await this.auth.ready()

    this.isMe = user?.id === this.event.data.userId
    this.isJoinRequest = this.event.data.userId === this.event.actorId

    this.changeDetectorRef.markForCheck()
  }
}

@Component({
  selector: 'resource-event-member-remove',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserAvatarComponent],
  template: `
    @if (notification) { Vous n'êtes plus membre de “{{ event.data.resourceName }}” } @else {
    <user-avatar showUsername="inline" [userIdOrName]="event.actorId" /> n'a plus accès à cette ressource }
  `,
})
class MemberRemoveEventComponent {
  protected event = inject(ResourceEventToken) as ResourceMemberRemoveEvent
  protected notification = inject(NOTIFICATION, { optional: true })
}

@Component({
  selector: 'resource-event-new-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserAvatarComponent, ResourcePipesModule],
  template: `
    <user-avatar showUsername="inline" [userIdOrName]="event.actorId" /> a passé “{{ event.data.resourceName }}” à “{{
      $any(event.data.newStatus) | resourceStatus
    }}”
  `,
})
class NewStatusItemComponent {
  protected event = inject(ResourceEventToken) as ResourceStatusChangeEvent
}

@Component({
  selector: 'resource-event-new-resource',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserAvatarComponent, ResourcePipesModule],
  template: `
    <user-avatar showUsername="inline" [userIdOrName]="event.actorId" /> a ajouté “{{ event.data.resourceName }}” dans
    le cercle ”{{ event.data.parentName }}”
  `,
})
class NewResourceEventComponent {
  protected event = inject(ResourceEventToken) as ResourceCreateEvent
}

@Component({
  selector: 'resource-event-item',
  templateUrl: './event-item.component.html',
  styleUrls: ['./event-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzEmptyModule, NzTimelineModule, ResourcePipesModule, DatePipe, NgComponentOutlet],
})
export class ResourceEventItemComponent {
  @Input()
  set item(value: ResourceEvent) {
    this._item = {
      event: value,
      injector: Injector.create({
        parent: this.injector,
        providers: [
          {
            provide: ResourceEventToken,
            useValue: value,
          },
          ...(this.notification ? [{ provide: NOTIFICATION, useValue: this.notification }] : []),
        ],
      }),
      renderer: {
        MEMBER_CREATE: MemberCreateEventComponent,
        MEMBER_REMOVE: MemberRemoveEventComponent,
        RESOURCE_CREATE: NewResourceEventComponent,
        RESOURCE_STATUS_CHANGE: NewStatusItemComponent,
      }[value.type],
    }
  }

  protected _item!: Item

  protected injector = inject(Injector)
  protected notification = inject(NOTIFICATION, { optional: true }) as Notification<ResourceEventNotification>

  constructor() {
    if (this.notification) {
      this.item = this.notification.data.eventInfo
    }
  }
}

interface Item {
  event: ResourceEvent
  injector: Injector
  renderer: ComponentType<unknown>
}
