
export const STORAGE_KEY = 'platon-feature-announcements';
export const MAX_DISPLAY_COUNT = 3; // Maximum 3 fois
export const MIN_INTERVAL_DAYS = 2; // Minimum 2 jours entre affichages
export const TOTAL_PERIOD_DAYS = 10; // Arrêter d'afficher après 10 jours
export const MS_PER_DAY = 1000 * 60 * 60 * 24;


export enum NotificationCloseReason {
  CLOSE = 'close',
  INTERACTION = 'interaction'
}


export interface AnnouncementDisplayStats {
  announcementId: string;
  firstShown: number;
  lastShown: number;
  timesShown: number;  // Nombre de fois que l'annonce a été affichée
  dismissed: boolean;
  interacted: boolean; // L'utilisateur a cliqué sur une action
}
