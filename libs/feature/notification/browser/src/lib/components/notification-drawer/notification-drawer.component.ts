import { animate, style, transition, trigger } from '@angular/animations'
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzDrawerModule } from 'ng-zorro-antd/drawer'
import { NzEmptyModule } from 'ng-zorro-antd/empty'

import { Notification } from '@platon/feature/notification/common'
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs'
import { NotificationService } from '../../api/notification.service'
import { NotificationListComponent } from '../notification-list/notification-list.component'

@Component({
  standalone: true,
  selector: 'notif-drawer',
  templateUrl: './notification-drawer.component.html',
  styleUrls: ['./notification-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzEmptyModule, NzButtonModule, NzDrawerModule, NotificationListComponent],
  animations: [
    trigger('fade', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('300ms ease', style({ opacity: 0 }))]),
    ]),
  ],
})
export class NotificationDrawerComponent implements OnInit, OnDestroy {
  private readonly counter = new BehaviorSubject(0)
  private readonly subscriptions: Subscription[] = []
  protected notifications: Notification[] = []

  protected visible = false
  protected hasMore = false
  protected fetchMore?: () => void
  protected markingAllAsRead = false
  protected deletingAll = false

  readonly count = this.counter.asObservable()

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly notificationSerivce: NotificationService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.notificationSerivce.paginate().subscribe(({ unreadCount, notifications, hasMore, fetchMore }) => {
        this.notifications = notifications
        this.counter.next(unreadCount)
        this.hasMore = hasMore
        this.fetchMore = fetchMore
        this.changeDetectorRef.markForCheck()
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe())
  }

  close(): void {
    this.visible = false
    this.changeDetectorRef.detectChanges()
  }

  open(): void {
    this.visible = true
    this.changeDetectorRef.detectChanges()
  }

  protected get hasNotifications(): boolean {
    return this.notifications.length > 0
  }

  protected get hasUnreads(): boolean {
    return this.notifications.some((notification) => !notification.readAt)
  }

  protected deleteAll(): void {
    this.deletingAll = true
    this.notificationSerivce.deleteAllNotifications().subscribe(() => {
      this.notifications = []
      this.deletingAll = false
      this.changeDetectorRef.detectChanges()
    })
  }

  protected async markAllAsRead(): Promise<void> {
    this.markingAllAsRead = true
    try {
      await firstValueFrom(this.notificationSerivce.markAllAsRead())
    } finally {
      this.markingAllAsRead = false
      this.changeDetectorRef.detectChanges()
    }
  }
}
