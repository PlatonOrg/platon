import { User, UserRoles } from '@platon/core/common';
import { OutputData } from '@editorjs/editorjs';


export interface Announcement {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt?: Date;
  advertiser?: User;
  active: boolean;
  displayUntil?: Date;
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
