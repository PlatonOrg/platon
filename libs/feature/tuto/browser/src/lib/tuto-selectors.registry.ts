/**
 * Registre central des sélecteurs DOM utilisés par les tutoriels.
 *
 * Chaque tutoriel déclare les IDs `#tuto-*` qu'il utilise via `attachTo.element` ou `advanceOn.selector`.
 * Le test `tuto-selectors.spec.ts` vérifie que chaque ID du registre existe dans un template HTML,
 * et que chaque `id="tuto-*"` dans les templates est référencé ici.
 *
 * Si un test échoue après un changement de template, il faut :
 *   1. Vérifier que l'ID n'a pas été supprimé par erreur
 *   2. Si l'ID a été intentionnellement supprimé, mettre à jour le registre ET le service tuto concerné
 */

/** Sélecteurs utilisés par le tutoriel toolbar */
export const TOOLBAR_SELECTORS = [
  'tuto-toolbar-menu-button',
  'tuto-help-button',
  'tuto-create-menu-container',
  'tuto-discord-button',
  'tuto-toolbar-theme-button',
  'tuto-toolbar-notifications-button',
  'tuto-user-avatar',
  'tuto-action-menu',
  'tuto-create-course',
  'tuto-create-circle',
  'tuto-create-activity',
  'tuto-create-exercise',
  'tuto-avatar-menu',
  'tuto-account',
  'tuto-personal-circle',
  'tuto-logout',
  'tuto-notif-menu',
  'tuto-theme-menu',
  'tuto-light-theme',
  'tuto-dark-theme',
  'tuto-system-theme',
  'tuto-notif-drawer',
  'tuto-user-charter',
] as const

/** Sélecteurs utilisés par le tutoriel sidebar */
export const SIDEBAR_SELECTORS = [
  'tuto-sidebar-logo',
  'tuto-sidebar-tableau-de-bord',
  'tuto-sidebar-annonces',
  'tuto-sidebar-cours',
  'tuto-sidebar-corrections',
  'tuto-sidebar-espace-de-travail',
  'tuto-sidebar-tests-d-entree',
  'tuto-sidebar-administration',
  'tuto-sidebar-documentation',
] as const

/** Sélecteurs utilisés par le tutoriel resources (espace de travail) */
export const RESOURCES_SELECTORS = [
  'tuto-resources-title',
  'tuto-search-bar',
  'tuto-resources-searchbar',
  'tuto-resources-list',
  'tuto-resources-filters',
  'tuto-resources-tree-button',
  'tuto-resources-sidebar',
  'tuto-resources-collapse-button',
  'tuto-resources-my-space',
  'tuto-resources-recent-views',
  'tuto-resources-filter-drawer',
  'tuto_filter_list',
  'tuto-recherche-avancee',
  'tuto-types-recourses',
  'tuto-apply-filters',
  'tuto-title-resource',
] as const

/** Sélecteurs utilisés par le tutoriel page ressource */
export const RESOURCE_PAGE_SELECTORS = [
  'tuto-breadcrumb',
  'tuto-tree-button',
  'tuto-resource-name',
  'tuto-resource-name-item',
  'tuto-resource-description',
  'tuto-status',
  'tuto-watch-button',
  'tuto-join-button',
  'tuto-cancel-join-button',
  'tuto-resource-actions',
  'tuto-move-to-owner-button',
  'tuto-delete-button',
  'tuto-move-button',
  'tuto-duplicate-button',
  'tuto-editor-button',
  'tuto-share-button',
  'tuto-preview-button',
  'tuto-resource-tabs',
  'tuto-overview-tab',
  'tuto-browse-tab',
  'tuto-events-tab',
  'tuto-settings-tab',
] as const

/** Sélecteurs utilisés par le tutoriel création de ressource */
export const RESOURCE_CREATION_SELECTORS = ['tuto-create-menu-container', 'tuto-action-menu'] as const

/** Sélecteurs utilisés par la page liste des cours */
export const COURSES_PAGE_SELECTORS = [
  'tuto-courses-course-list',
  'tuto-courses-create-button',
  'tuto-courses-show-all-button',
  'tuto-courses-no-courses',
] as const

/** Sélecteurs utilisés par le tutoriel page de cours */
export const COURSE_PAGE_SELECTORS = [
  'tuto-course-header',
  'tuto-course-title',
  'tuto-course-description',
  'tuto-course-toolbar',
  'tuto-course-share-button',
  'tuto-course-tab-dashboard',
  'tuto-course-tab-challenges',
  'tuto-course-tab-members',
  'tuto-course-tab-groups',
  'tuto-course-tab-settings',
] as const

/** Sélecteurs utilisés par le tutoriel gestion de cours (dashboard) */
export const COURSE_MANAGEMENT_SELECTORS = [
  'tuto-course-dashboard-content',
  'tuto-course-dashboard-header',
  'tuto-course-search-bar',
  'tuto-course-add-section-button',
  'tuto-course-add-activity-button',
  'tuto-course-add-activity-table-button',
  'tuto-course-csv-download',
  'tuto-course-view-mode',
  'tuto-course-sections-container',
  'tuto-course-activities-table',
  'tuto-course-section-actions',
  'tuto-course-no-activities',
  'tuto-course-no-sections',
  'tuto-course-add-first-section-button',
  'tuto-course-statistics',
  'tuto-course-stat-progression',
  'tuto-course-stat-time',
  'tuto-course-stat-teachers',
  'tuto-course-stat-students',
  'tuto-first-activity-card',
] as const

/**
 * Tous les sélecteurs `tuto-*` utilisés par les tutoriels.
 * Le test vérifie que chaque ID de cette liste existe dans au moins un template HTML.
 */
export const ALL_TUTO_SELECTORS = [
  ...TOOLBAR_SELECTORS,
  ...SIDEBAR_SELECTORS,
  ...RESOURCES_SELECTORS,
  ...RESOURCE_PAGE_SELECTORS,
  ...RESOURCE_CREATION_SELECTORS,
  ...COURSES_PAGE_SELECTORS,
  ...COURSE_PAGE_SELECTORS,
  ...COURSE_MANAGEMENT_SELECTORS,
] as const
