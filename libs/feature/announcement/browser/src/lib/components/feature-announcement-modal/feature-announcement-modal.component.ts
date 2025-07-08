import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
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

  private subscription: Subscription[] = [];
  private notificationId: string | null = null;

  // Propriétés pour la notification
  currentIcon = 'notification';
  currentTitle = 'Annonce';
  currentDescription = '';
  currentVersion = '';
  hasPrimaryAction = true;
  hasSecondaryAction = false;
  primaryActionText = 'OK';
  secondaryActionText = 'Annuler';

  constructor(
    private readonly featureAnnouncementService: FeatureAnnouncementService,
    private readonly notification: NzNotificationService
  ) {}

  ngOnInit(): void {
    this.subscription.push(
      this.featureAnnouncementService.announcementVisibilityChanged.subscribe(isVisible => {
        if (isVisible) {
          const announcement = this.featureAnnouncementService.currentAnnouncement();
          if (announcement) {
            this.updateProperties(announcement);
            this.showNotification();
          }
        } else if (this.notificationId) {
          this.notification.remove(this.notificationId);
          this.notificationId = null;
        }
      })
    );

    if (this.featureAnnouncementService.isAnnouncementVisible()) {
      const announcement = this.featureAnnouncementService.currentAnnouncement();
      if (announcement) {
        this.updateProperties(announcement);
        this.showNotification();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.subscription.length > 0) {
      this.subscription.forEach(sub => sub.unsubscribe());
    }

    if (this.notificationId) {
      this.notification.remove(this.notificationId);
      this.notificationId = null;
    }
  }

  private updateProperties(announcement: Announcement): void {
    this.currentIcon = announcement.icon || 'notification';
    this.currentTitle = announcement.title || 'Annonce';
    this.currentDescription = announcement.description || '';
    this.currentVersion = announcement.version || '';
    this.hasPrimaryAction = true;
    this.primaryActionText = 'Voir détails';
  }

  private showNotification(): void {
    if (this.notificationId) {
      this.notification.remove(this.notificationId);
      this.notificationId = null;
    }

    const ref = this.notification.template(
      this.notificationTpl,
      {
        nzDuration: 0,
        nzPlacement: 'topRight',
        nzStyle: { width: '250px', top: '30px', right: '5px' },
        nzData: {
          icon: this.currentIcon,
          title: this.currentTitle,
          description: this.currentDescription,
          version: this.currentVersion,
          hasPrimaryAction: this.hasPrimaryAction,
          hasSecondaryAction: this.hasSecondaryAction,
          primaryActionText: this.primaryActionText,
          secondaryActionText: this.secondaryActionText
        }
      }
    );
    this.notificationId = ref.messageId;
  }

  get isVisible() {
    return this.featureAnnouncementService.isAnnouncementVisible();
  }

  get announcement() {
    return this.featureAnnouncementService.currentAnnouncement();
  }

  onPrimaryAction(): void {
    this.featureAnnouncementService.onAnnouncementClick();
  }


  onClose(): void {
    if (this.notificationId) {
      this.notification.remove(this.notificationId);
      this.notificationId = null;
    }
    this.featureAnnouncementService.dismissAnnouncement(NotificationCloseReason.CLOSE);
  }
}
