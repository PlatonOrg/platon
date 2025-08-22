import { Injectable, signal, EventEmitter, OnDestroy, inject } from '@angular/core';
import { User, UserRoles, isTeacherRole } from '@platon/core/common';
import { AnnouncementDisplayStats, STORAGE_KEY, MAX_DISPLAY_COUNT, MIN_INTERVAL_DAYS, TOTAL_PERIOD_DAYS, MS_PER_DAY, NotificationCloseReason } from "../models/data-storage.model";
import { Announcement } from '@platon/feature/announcement/common'
import { AnnouncementService } from './announcement.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FeatureAnnouncementService implements OnDestroy {
  private readonly announcementService = inject(AnnouncementService);
  private readonly router = inject(Router);

  // Event émis quand la visibilité d'une annonce change
  announcementVisibilityChanged = new EventEmitter<{ announcementId: string; visible: boolean }>();

  // Signal pour les annonces visibles
  visibleAnnouncements = signal<Announcement[]>([]);

  private announcements: Announcement[] = [];

  ngOnDestroy(): void {
    this.cleanupExpiredAnnouncements();
  }

  /**
   * Charge les annonces actives depuis la base de données
   */
  async loadActiveAnnouncements(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.announcementService.getActiveAnnouncements()
      );

      // Filtrer les annonces encore valides
      this.announcements = response.resources.filter(announcement =>
        this.isAnnouncementStillValid(announcement)
      );

      // Nettoyer les statistiques des annonces expirées
      this.cleanupExpiredAnnouncements();
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error);
      this.announcements = [];
    }
  }

  /**
   * Vérifie si une annonce est encore valide temporellement
   */
  private isAnnouncementStillValid(announcement: Announcement): boolean {
    const now = new Date();

    // Vérifier la date d'expiration explicite
    if (announcement.displayUntil) {
      const displayUntil = new Date(announcement.displayUntil);
      if (now > displayUntil) {
        return false;
      }
    }

    // Vérifier la durée d'affichage en jours
    if (announcement.displayDurationInDays && announcement.createdAt) {
      const createdAt = new Date(announcement.createdAt);
      const durationMs = announcement.displayDurationInDays * MS_PER_DAY;
      const expirationDate = new Date(createdAt.getTime() + durationMs);

      if (now > expirationDate) {
        return false;
      }
    }

    // Si aucune date d'expiration n'est définie, utiliser TOTAL_PERIOD_DAYS
    if (!announcement.displayUntil && !announcement.displayDurationInDays && announcement.createdAt) {
      const createdAt = new Date(announcement.createdAt);
      const defaultDurationMs = TOTAL_PERIOD_DAYS * MS_PER_DAY;
      const defaultExpirationDate = new Date(createdAt.getTime() + defaultDurationMs);

      if (now > defaultExpirationDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Vérifie si une annonce doit être affichée pour l'utilisateur
   */
  async checkForAnnouncements(user: User): Promise<void> {
    if (!this.canUserSeeAnnouncements(user)) {
      return;
    }

    // Recharger les annonces actives depuis la base de données
    await this.loadActiveAnnouncements();

    const relevantAnnouncements = this.getRelevantAnnouncements(user);
    const announcementsToShow = this.selectAnnouncementsToShow(relevantAnnouncements);

    if (announcementsToShow.length > 0) {
      this.showAnnouncements(announcementsToShow.reverse());
    }
  }

  /**
   * Vérifie si l'utilisateur peut voir les annonces
   */
  private canUserSeeAnnouncements(user: User): boolean {
    return user.role === UserRoles.admin || isTeacherRole(user.role) || user.role === UserRoles.student;
  }

  /**
   * Récupère les annonces pertinentes pour l'utilisateur
   */
  private getRelevantAnnouncements(user: User): Announcement[] {
    return this.announcements.filter(announcement => {
      // Si aucun rôle ciblé n'est défini, l'annonce est pour tous
      if (!announcement.targetedRoles || announcement.targetedRoles.length === 0) {
        return true;
      }

      // Sinon vérifier si le rôle de l'utilisateur est dans les rôles ciblés
      return announcement.targetedRoles.includes(user.role);
    });
  }

  /**
   * Sélectionne les annonces à afficher selon les règles de fréquence
   */
  private selectAnnouncementsToShow(announcements: Announcement[]): Announcement[] {
    // Trier par date de création (plus récentes en premier)
    const sortedAnnouncements = announcements
      .filter(a => this.isAnnouncementStillValid(a))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filtrer pour ne garder que les annonces qui doivent être affichées
    return sortedAnnouncements.filter(announcement => this.shouldShowAnnouncement(announcement));
  }

  /**
   * Détermine si une annonce spécifique doit être affichée
   */
  private shouldShowAnnouncement(announcement: Announcement): boolean {
    const stats = this.getAnnouncementStats(announcement.id);
    const now = Date.now();

    // Vérifier d'abord si l'annonce est encore valide temporellement
    if (!this.isAnnouncementStillValid(announcement)) {
      // Supprimer les statistiques de l'annonce expirée
      this.removeAnnouncementStats(announcement.id);
      return false;
    }

    // Si l'utilisateur a déjà interagi ou explicitement refusé
    if (stats.dismissed || stats.interacted) {
      return false;
    }

    // Si jamais affiché, on peut l'afficher
    if (stats.timesShown === 0) {
      return true;
    }

    // Vérifier si on a atteint la limite d'affichage
    if (stats.timesShown >= MAX_DISPLAY_COUNT) {
      return false;
    }

    // Vérifier si assez de temps s'est écoulé depuis le dernier affichage
    const daysSinceLastShown = (now - stats.lastShown) / MS_PER_DAY;
    if (daysSinceLastShown < MIN_INTERVAL_DAYS) {
      return false;
    }

    // Calculer la période d'affichage effective pour cette annonce
    const effectivePeriod = this.getEffectiveDisplayPeriod(announcement);
    const daysSinceFirstShown = (now - stats.firstShown) / MS_PER_DAY;

    return daysSinceFirstShown > effectivePeriod ? false : true;
  }

  /**
   * Calcule la période d'affichage effective d'une annonce
   */
  private getEffectiveDisplayPeriod(announcement: Announcement): number {
    if (announcement.displayDurationInDays) {
      return announcement.displayDurationInDays;
    }

    if (announcement.displayUntil && announcement.createdAt) {
      const createdAt = new Date(announcement.createdAt).getTime();
      const displayUntil = new Date(announcement.displayUntil).getTime();
      return (displayUntil - createdAt) / MS_PER_DAY;
    }

    // Utiliser la période par défaut
    return TOTAL_PERIOD_DAYS;
  }

  /**
   * Affiche les annonces
   */
  private showAnnouncements(announcements: Announcement[]): void {
    // Mettre à jour le signal avec toutes les annonces visibles
    this.visibleAnnouncements.set(announcements);

    // Enregistrer l'affichage pour chaque annonce
    announcements.forEach(announcement => {
      this.recordAnnouncementShown(announcement.id);
      // Émettre un événement pour chaque annonce
      this.announcementVisibilityChanged.emit({
        announcementId: announcement.id,
        visible: true
      });
    });
  }

  /**
   * Ferme une annonce spécifique
   */
  dismissAnnouncement(announcementId: string, reason: NotificationCloseReason): void {
    // Enregistrer la fermeture de l'annonce
    this.recordAnnouncementDismissed(announcementId, reason);

    // Retirer l'annonce de la liste des annonces visibles
    const currentAnnouncements = this.visibleAnnouncements();
    const updatedAnnouncements = currentAnnouncements.filter(a => a.id !== announcementId);
    this.visibleAnnouncements.set(updatedAnnouncements);

    // Émettre un événement pour cette annonce spécifique
    this.announcementVisibilityChanged.emit({
      announcementId,
      visible: false
    });
  }

  /**
   * Action principale : naviguer vers l'annonce
   */
  onAnnouncementClick(announcementId: string): void {
    this.recordAnnouncementInteraction(announcementId);
    this.dismissAnnouncement(announcementId, NotificationCloseReason.INTERACTION);
    this.navigateToAnnouncement(announcementId);
  }

  /**
   * Navigue vers la page d'annonces avec l'annonce sélectionnée
   */
  navigateToAnnouncement(announcementId: string): void {
    this.router.navigate(['/announcements'], {
      queryParams: { highlight: announcementId }
    });
  }



  /**
   * Récupère une annonce spécifique par son ID
   */
  getAnnouncement(announcementId: string): Announcement | undefined {
    return this.visibleAnnouncements().find(a => a.id === announcementId);
  }

  /**
   * Nettoie les statistiques des annonces expirées du localStorage
   */
  private cleanupExpiredAnnouncements(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const allStats: Record<string, AnnouncementDisplayStats> = JSON.parse(stored);
    const validAnnouncementIds = new Set(this.announcements.map(a => a.id));

    // Filtrer les statistiques pour ne garder que celles des annonces encore valides
    const cleanedStats: Record<string, AnnouncementDisplayStats> = {};

    Object.entries(allStats).forEach(([announcementId, stats]) => {
      // Garder les statistiques si l'annonce est encore valide
      if (validAnnouncementIds.has(announcementId)) {
        cleanedStats[announcementId] = stats;
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedStats));
  }

  /**
   * Supprime les statistiques d'une annonce du localStorage
   */
  private removeAnnouncementStats(announcementId: string): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const allStats: Record<string, AnnouncementDisplayStats> = JSON.parse(stored);
    delete allStats[announcementId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStats));
  }

  /**
   * Récupère les statistiques d'affichage d'une annonce
   */
  private getAnnouncementStats(announcementId: string): AnnouncementDisplayStats {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allStats: Record<string, AnnouncementDisplayStats> = stored ? JSON.parse(stored) : {};

    return allStats[announcementId] || {
      announcementId,
      firstShown: 0,
      lastShown: 0,
      timesShown: 0,
      dismissed: false,
      interacted: false
    };
  }

  /**
   * Enregistre qu'une annonce a été affichée
   */
  private recordAnnouncementShown(announcementId: string): void {
    const stats = this.getAnnouncementStats(announcementId);
    const now = Date.now();

    stats.timesShown++;
    stats.lastShown = now;
    if (stats.firstShown === 0) {
      stats.firstShown = now;
    }

    this.saveAnnouncementStats(announcementId, stats);
  }

  /**
   * Enregistre qu'une annonce a été fermée
   */
  private recordAnnouncementDismissed(announcementId: string, reason: NotificationCloseReason): void {
    const stats = this.getAnnouncementStats(announcementId);

    if (reason === NotificationCloseReason.CLOSE) {
      stats.dismissed = true; // Ne plus jamais afficher
    }
    this.saveAnnouncementStats(announcementId, stats);
  }

  /**
   * Enregistre qu'une annonce a provoqué une interaction
   */
  private recordAnnouncementInteraction(announcementId: string): void {
    const stats = this.getAnnouncementStats(announcementId);
    stats.interacted = true;
    this.saveAnnouncementStats(announcementId, stats);
  }

  /**
   * Sauvegarde les statistiques dans le localStorage
   */
  private saveAnnouncementStats(announcementId: string, stats: AnnouncementDisplayStats): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allStats: Record<string, AnnouncementDisplayStats> = stored ? JSON.parse(stored) : {};

    allStats[announcementId] = stats;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStats));
  }

  // Méthodes pour le debugging et testing
  resetAnnouncementStats(announcementId: string): void {
    this.removeAnnouncementStats(announcementId);
  }

  resetAllAnnouncementStats(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  protected getAllAnnouncementStats(): Record<string, AnnouncementDisplayStats> {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }
}
