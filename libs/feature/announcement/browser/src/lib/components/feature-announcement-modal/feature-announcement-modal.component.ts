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
  private posY = 90

  private readonly featureAnnouncementService = inject(FeatureAnnouncementService);
  private readonly notification = inject(NzNotificationService);

  private subscription: Subscription[] = [];
  private activeNotifications = new Map<string, AnnouncementNotification>();

  // Signal computed pour obtenir les annonces visibles
  visibleAnnouncements = computed(() => this.featureAnnouncementService.visibleAnnouncements());

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

    // Afficher les annonces déjà visibles au moment de l'initialisation
   /* const currentAnnouncements = this.featureAnnouncementService.visibleAnnouncements().reverse() ;
    currentAnnouncements.forEach(announcement => {
      this.showNotification(announcement);
    });*/
  }

  ngOnDestroy(): void {
    this.subscription.forEach(sub => sub.unsubscribe());

    // Nettoyer toutes les notifications actives
    this.activeNotifications.forEach(notif => {
      this.notification.remove(notif.notificationId);
    });
    this.activeNotifications.clear();
  }

  private showNotification(announcement: Announcement): void {
    // Éviter les doublons
    if (this.activeNotifications.has(announcement.id)) {
      return;
    }

    // Calculer la position en fonction du nombre de notifications actives
    const notificationIndex = this.activeNotifications.size;
    console.log('Notification index: ', notificationIndex);
    const topPosition = this.posX + (notificationIndex * this.posY)

    const ref = this.notification.template(
      this.notificationTpl,
      {
        nzDuration: 0,
        nzPlacement: 'topRight',
        nzStyle: {
          width: this.width,//'280px',
          position: 'fixed',
          top: `${topPosition}px`,
          right: '5px',
          zIndex: 1050 + notificationIndex // Z-index croissant pour éviter les superpositions
        },
        nzData: announcement // Passer directement l'annonce au lieu d'un objet wrapper
      }
    );

    // Stocker la notification
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

      // Réorganiser les positions des notifications restantes
      this.repositionNotifications();
    }
  }

  private repositionNotifications(): void {
    // Créer un nouveau Map pour éviter les problèmes de concurrence
    const notificationsToReposition = Array.from(this.activeNotifications.entries());

    // Supprimer toutes les notifications existantes
    notificationsToReposition.forEach(([announcementId, notif]) => {
      this.notification.remove(notif.notificationId);
    });

    // Vider le Map
    this.activeNotifications.clear();

    // Recréer les notifications avec les nouvelles positions
    notificationsToReposition.forEach(([announcementId, notif], index) => {
      const topPosition = this.posX + (index * this.posY); // Même logique que showNotification

      const ref = this.notification.template(
        this.notificationTpl,
        {
          nzDuration: 0,
          nzPlacement: 'topRight',
          nzStyle: {
            width: this.width,//'280px',
            position: 'fixed',
            top: `${topPosition}px`,
            right: '5px',
            zIndex: 1050 + index // Z-index croissant pour éviter les superpositions
          },
          nzData: notif.announcement // Passer directement l'annonce
        }
      );

      // Remettre dans le Map avec le nouvel ID
      this.activeNotifications.set(announcementId, {
        announcement: notif.announcement,
        notificationId: ref.messageId,
        templateRef: this.notificationTpl
      });
    });
  }


  onPrimaryAction(notification: any): void {
    // Extraire l'objet Announcement de la notification
    const announcement = notification?.options?.nzData;

    if (announcement && announcement.id) {
      console.log('Id est clair : ', announcement.id);
      this.featureAnnouncementService.onAnnouncementClick(announcement.id);
    } else {
      console.error('Invalid announcement object in primary action:', notification);
    }
  }


  onClose(notification: any): void {
    console.log('Close clicked for:', notification);

    // Extraire l'objet Announcement de la notification
    const announcement = notification?.options?.nzData;

    if (announcement && announcement.id) {
      this.featureAnnouncementService.dismissAnnouncement(announcement.id, NotificationCloseReason.CLOSE);
      this.hideNotification(announcement.id);
    } else {
      console.error('Invalid announcement object:', notification);
    }
  }



  // Méthodes utilitaires pour le template
  isAnnouncementVisible(announcementId: string): boolean {
    return this.featureAnnouncementService.isAnnouncementVisible(announcementId);
  }

  getAnnouncement(announcementId: string): Announcement | undefined {
    return this.featureAnnouncementService.getAnnouncement(announcementId);
  }
}
