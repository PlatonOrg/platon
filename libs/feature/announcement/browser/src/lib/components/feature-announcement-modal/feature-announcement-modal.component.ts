import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, TemplateRef, ViewChild, inject, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FeatureAnnouncementService } from '../../api/feature-announcement.service';
import { NotificationCloseReason } from '../../models/data-storage.model'
import { NzNotificationModule, NzNotificationService } from 'ng-zorro-antd/notification';
import { Subscription } from 'rxjs';
import { Announcement } from '@platon/feature/announcement/common';

interface AnnouncementNotification {
  announcement: Announcement;
  notificationId: string;
  templateRef: TemplateRef<any>;
}

@Component({
  selector: 'feature-announcement-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzNotificationModule
  ],
  templateUrl: './feature-announcement-modal.component.html',
  styleUrls: ['./feature-announcement-modal.component.scss'],
})
export class FeatureAnnouncementModalComponent implements OnInit, OnDestroy {
  @ViewChild('notificationTpl', { static: true })
  notificationTpl!: TemplateRef<any>;

  private width = '290px'
  private posX = 60
  private posY = 50

  private readonly featureAnnouncementService = inject(FeatureAnnouncementService);
  private readonly notification = inject(NzNotificationService);

  private subscription: Subscription[] = [];
  private activeNotifications = new Map<string, AnnouncementNotification>();


  ngOnInit(): void {
    this.subscription.push(
      this.featureAnnouncementService.announcementVisibilityChanged.subscribe(event => {
        if (event.visible) {
          const announcement = this.featureAnnouncementService.getAnnouncement(event.announcementId)
          if (announcement) {
            this.showNotification(announcement);
          }
        } else {
          this.hideNotification(event.announcementId);
        }
      })
    );

  }

  ngOnDestroy(): void {
    this.subscription.forEach(sub => sub.unsubscribe());

    this.activeNotifications.forEach(notif => {
      this.notification.remove(notif.notificationId);
    });
    this.activeNotifications.clear();
  }

  private showNotification(announcement: Announcement): void {
    if (this.activeNotifications.has(announcement.id)) {
      return;
    }

    const notificationIndex = this.activeNotifications.size;
    console.log('Notification index: ', notificationIndex);
    const topPosition = this.posX + (notificationIndex * this.posY)

    const ref = this.notification.template(
      this.notificationTpl,
      {
        nzDuration: 0,
        nzPlacement: 'topRight',
        nzStyle: {
          width: this.width,
          position: 'fixed',
          top: `${topPosition}px`,
          right: '5px',
          zIndex: 1050 + notificationIndex
        },
        nzData: announcement
      }
    );

    this.activeNotifications.set(announcement.id, {
      announcement,
      notificationId: ref.messageId,
      templateRef: this.notificationTpl
    });
  }

  private hideNotification(announcementId: string): void {
    const notificationInfo = this.activeNotifications.get(announcementId);
    if (notificationInfo) {
      this.notification.remove(notificationInfo.notificationId);
      this.activeNotifications.delete(announcementId);

      this.repositionNotifications();
    }
  }

  private repositionNotifications(): void {
    const notificationsToReposition = Array.from(this.activeNotifications.entries());

    notificationsToReposition.forEach(([announcementId, notif]) => {
      this.notification.remove(notif.notificationId);
    });

    this.activeNotifications.clear();

    // Recréer les notifications avec les nouvelles positions
    notificationsToReposition.forEach(([announcementId, notif], index) => {
      const topPosition = this.posX + (index * this.posY);

      const ref = this.notification.template(
        this.notificationTpl,
        {
          nzDuration: 0,
          nzPlacement: 'topRight',
          nzStyle: {
            width: this.width,
            position: 'fixed',
            top: `${topPosition}px`,
            right: '5px',
            zIndex: 1050 + index
          },
          nzData: notif.announcement
        }
      );

      this.activeNotifications.set(announcementId, {
        announcement: notif.announcement,
        notificationId: ref.messageId,
        templateRef: this.notificationTpl
      });
    });
  }


  onPrimaryAction(notification: any): void {
    const announcement = notification?.options?.nzData;

    if (announcement && announcement.id) {
      this.featureAnnouncementService.onAnnouncementClick(announcement.id);
    }
  }


  onClose(notification: any): void {

    // Extraire l'objet Announcement de la notification
    const announcement = notification?.options?.nzData;

    if (announcement && announcement.id) {
      this.featureAnnouncementService.dismissAnnouncement(announcement.id, NotificationCloseReason.CLOSE);
      this.hideNotification(announcement.id);
    }
  }
}
