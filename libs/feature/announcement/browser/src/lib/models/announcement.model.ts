import { UserRoles } from '@platon/core/common';
import { OutputData } from '@editorjs/editorjs';


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

// TOUT CE QUI EST EN BAS EST À METTRE DANS LE REPERTOIRE COMMON

export interface Announcement {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt?: Date;
  active: boolean;
  displayUntil?: Date; // Optionnel, si l'annonce doit être affichée jusqu'à une certaine date
  displayDurationInDays?: number;
  targetedRoles?: UserRoles[];
  version?: string; // Version de l'annonce, pour le suivi des changements
  icon?: string;
  data?: OutputData; // Données EditorJS pour le contenu formaté
  actions?: AnnouncementAction[];
}

export interface AnnouncementAction {
  label: string; // Texte du bouton d'action
  url?: string; // URL vers laquelle rediriger
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link'; // Type de bouton
}

export interface AnnouncementFilters {
  search?: string;
  active?: boolean;
  roles?: UserRoles[];
  limit?: number;
  offset?: number;
}

export type AnnouncementExpandableFields = 'data';