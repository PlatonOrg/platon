import { Injectable, signal, EventEmitter } from '@angular/core';
import { User, UserRoles, isTeacherRole } from '@platon/core/common';
import { TutorialSelectorService } from "@platon/feature/tuto/browser";
import { AnnouncementDisplayStats, STORAGE_KEY, MAX_DISPLAY_COUNT,  MIN_INTERVAL_DAYS, TOTAL_PERIOD_DAYS, MS_PER_DAY, NotificationCloseReason } from "../models/data-storage.model";


export interface FeatureAnnouncement {
  id: string;
  title: string;
  description: string;
  icon: string;
  version: string;
  targetRoles: UserRoles[];
  priority: 'low' | 'medium' | 'high';
  actions: {
    primary: {
      text: string;
      action: () => void;
    };
    secondary?: {
      text: string;
      action: () => void;
    };
  };
}



@Injectable({
  providedIn: 'root'
})
export class FeatureAnnouncementService {

  announcementVisibilityChanged = new EventEmitter<boolean>();

  private _visible = false;

  isAnnouncementVisible = signal(false);
  currentAnnouncement = signal<FeatureAnnouncement | null>(null);

  // private readonly MAX_DISPLAY_COUNT = 3; // Maximum 3 fois
  // private readonly MIN_INTERVAL_DAYS = 2; // Minimum 2 jours entre affichages
  // private readonly TOTAL_PERIOD_DAYS = 14; // Arrêter d'afficher après 14 jours

  private announcements: FeatureAnnouncement[] = [
    {
      id: 'tutorials-feature-2025',
      title: 'Nouvelle fonctionnalité : Tutoriels interactifs !',
      description: `Découvrez nos nouveaux tutoriels pour maîtriser PLaTon rapidement !
                   Apprenez à créer des ressources, gérer vos cours et organiser votre contenu pédagogique
                   avec des guides pas-à-pas interactifs.`,
      icon: 'graduation-cap',
      version: '2025.1',
      targetRoles: [UserRoles.teacher, UserRoles.admin],
      priority: 'high',
      actions: {
        primary: {
          text: 'Découvrir',
          action: () => this.openTutorialSelector()
        },
      }
    }
    // Possibilité d'ajouter d'autres annonces futures
  ];

  constructor(private tutorialSelectorService: TutorialSelectorService) {}




  /**
   * Vérifie si une annonce doit être affichée pour l'utilisateur
   */
  checkForAnnouncements(user: User): void {
    if (!this.canUserSeeAnnouncements(user)) {
      return;
    }

    const relevantAnnouncements = this.getRelevantAnnouncements(user);
    const announcementToShow = this.selectAnnouncementToShow(relevantAnnouncements);

    if (announcementToShow) {
      this.showAnnouncement(announcementToShow);
    }
  }

  /**
   * Vérifie si l'utilisateur peut voir les annonces
   */
  private canUserSeeAnnouncements(user: User): boolean {
    return user.role === UserRoles.admin || isTeacherRole(user.role);
  }

  /**
   * Récupère les annonces pertinentes pour l'utilisateur
   */
  private getRelevantAnnouncements(user: User): FeatureAnnouncement[] {
    return this.announcements.filter(announcement =>
      announcement.targetRoles.includes(user.role)
    );
  }

  /**
   * Sélectionne l'annonce à afficher selon les règles de fréquence
   */
  private selectAnnouncementToShow(announcements: FeatureAnnouncement[]): FeatureAnnouncement | null {
    for (const announcement of announcements) {
      if (this.shouldShowAnnouncement(announcement)) {
        return announcement;
      }
    }
    return null;
  }

  /**
   * Détermine si une annonce spécifique doit être affichée
   */
  private shouldShowAnnouncement(announcement: FeatureAnnouncement): boolean {
    const stats = this.getAnnouncementStats(announcement.id);
    const now = Date.now();

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
    const daysSinceLastShown = (now - stats.lastShown) / MS_PER_DAY; //(1000 * 60 * 60 * 24);
    if (daysSinceLastShown < MIN_INTERVAL_DAYS) {
      return false;
    }

    // Vérifier si on est dans la période totale d'affichage
    const daysSinceFirstShown = (now - stats.firstShown) / MS_PER_DAY; //(1000 * 60 * 60 * 24);
    if (daysSinceFirstShown > TOTAL_PERIOD_DAYS) {
      return false;
    }

    return true;
  }

  /**
   * Affiche l'annonce
   */
  private showAnnouncement(announcement: FeatureAnnouncement): void {
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
    const stored = localStorage.getItem(STORAGE_KEY);
    const allStats: Record<string, AnnouncementDisplayStats> = stored ? JSON.parse(stored) : {};

    delete allStats[announcementId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStats));
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
    if (announcement && this.canUserSeeAnnouncements(user)) {
      this.showAnnouncement(announcement);
    }
  }
}