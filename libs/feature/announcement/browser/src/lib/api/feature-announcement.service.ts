import { Injectable, signal, EventEmitter, OnDestroy } from '@angular/core'
import { User } from '@platon/core/common';
import { TutorialSelectorService } from "@platon/feature/tuto/browser";
import { AnnouncementDisplayStats, STORAGE_KEY, MAX_DISPLAY_COUNT,  MIN_INTERVAL_DAYS, TOTAL_PERIOD_DAYS, MS_PER_DAY, NotificationCloseReason } from "../models/data-storage.model";
import { Announcement } from '@platon/feature/announcement/common'
import { AnnouncementService } from './announcement.service';
import { Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'





@Injectable({
  providedIn: 'root'
})
export class FeatureAnnouncementService implements OnDestroy {

  announcementVisibilityChanged = new EventEmitter<boolean>();

  private _visible = false;

  isAnnouncementVisible = signal(false);
  currentAnnouncement = signal<Announcement | null>(null);

  private announcements: Announcement[] = [];

  constructor(private tutorialSelectorService: TutorialSelectorService,
              private announcementService: AnnouncementService,
              private router : Router)
  {}


  ngOnDestroy(): void {
    this.cleanupExpiredAnnouncements()
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
    if (announcement.displayUntil) {
      const displayUntil = new Date(announcement.displayUntil);
      if (now > displayUntil) {
        return false;
      }
    }
    if (announcement.displayDurationInDays && announcement.createdAt) {
      const createdAt = new Date(announcement.createdAt);
      const durationMs = announcement.displayDurationInDays * MS_PER_DAY;
      const expirationDate = new Date(createdAt.getTime() + durationMs);

      if (now > expirationDate) {
        return false;
      }
    }

    // Si aucune date d'expiration n'est définie, on utilise TOTAL_PERIOD_DAYS
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

    await this.loadActiveAnnouncements()
    const relevantAnnouncements = this.getRelevantAnnouncements(user);
    const announcementToShow = this.selectAnnouncementToShow(relevantAnnouncements);

    if (announcementToShow) {
      this.showAnnouncement(announcementToShow);
    }
  }


  /**
   * Récupère les annonces pertinentes pour l'utilisateur
   */
  private getRelevantAnnouncements(user: User): Announcement[] {
    return this.announcements.filter(announcement => {
      if (!announcement.targetedRoles || announcement.targetedRoles.length === 0) {
        return true;
      }
      return announcement.targetedRoles.includes(user.role);
    });
  }

  /**
   * Sélectionne l'annonce à afficher selon les règles de fréquence
   */
  private selectAnnouncementToShow(announcements: Announcement[]): Announcement | null {
    // Trier par date de création (plus récentes en premier)
    const sortedAnnouncements = announcements
      .filter(a => this.isAnnouncementStillValid(a))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const announcement of sortedAnnouncements) {
      if (this.shouldShowAnnouncement(announcement)) {
        return announcement;
      }
    }
    return null;
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

    if (daysSinceFirstShown > effectivePeriod) {
      return false;
    }

    return true;
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
   * Navigue vers la page d'annonces avec l'annonce sélectionnée
   */
  navigateToAnnouncement(announcementId: string): void {
    this.router.navigate(['/announcements'], {
      queryParams: { highlight: announcementId }
    });
  }


  /**
   * Action principale : naviguer vers l'annonce
   */
  onAnnouncementClick(): void {
    const announcement = this.currentAnnouncement();
    if (announcement) {
      this.recordAnnouncementInteraction(announcement.id);
      this.dismissAnnouncement(NotificationCloseReason.INTERACTION);
      this.navigateToAnnouncement(announcement.id);
    }
  }

  /**
   * Affiche l'annonce
   */
  private showAnnouncement(announcement: Announcement): void {
    this.currentAnnouncement.set(announcement);
    this.isAnnouncementVisible.set(true);
    this.recordAnnouncementShown(announcement.id);
    this._visible = true;
    this.announcementVisibilityChanged.emit(true);
  }

    // Méthode pour cacher une annonce
  hideAnnouncement(): void {
    this._visible = false;
    this.announcementVisibilityChanged.emit(false);
  }



  /**
   * Ferme l'annonce
   */
  dismissAnnouncement(reason: NotificationCloseReason): void {
    const currentAnnouncement = this.currentAnnouncement();
    if (currentAnnouncement) {
      this.recordAnnouncementDismissed(currentAnnouncement.id, reason);
    }

    this.isAnnouncementVisible.set(false);
    this.currentAnnouncement.set(null);
    this.hideAnnouncement();

  }

  /**
   * Action principale : ouvrir le sélecteur de tutoriels
   */
  private openTutorialSelector(): void {
    this.recordAnnouncementInteraction(this.currentAnnouncement()?.id || '');
    this.dismissAnnouncement(NotificationCloseReason.INTERACTION);
    this.tutorialSelectorService.openTutorialSelector();
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

    if (reason === NotificationCloseReason.CLOSE) {  // ALors ici je ne sais encore si on va garder le 'close' ou 'interaction'
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



  /**
   * Réinitialise les statistiques d'une annonce (pour testing)
   */
  resetAnnouncementStats(announcementId: string): void {
    this.removeAnnouncementStats(announcementId);
  }

  /**
   * Réinitialise toutes les statistiques (pour testing)
   */
  resetAllAnnouncementStats(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Obtient les statistiques de toutes les annonces (pour debugging)
   */
  protected getAllAnnouncementStats(): Record<string, AnnouncementDisplayStats> {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Force l'affichage d'une annonce (pour testing)
   */
  protected forceShowAnnouncement(announcementId: string, user: User): void {
    const announcement = this.announcements.find(a => a.id === announcementId);
    if (announcement) {
      this.showAnnouncement(announcement);
    }
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
}
