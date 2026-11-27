import { Injectable, inject } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'

@Injectable({ providedIn: 'root' })
export class BuilderTutorialService {
  private readonly shepherd = inject(ShepherdService)
  /** Parcours complet : sélection de modèle → builder */
  startFullBuilderTutorial(): void {
    const steps = [...this.buildTemplateSelectionSteps(), ...this.buildBuilderSteps()]
    this.shepherd.startTutorial(steps, {
      tourName: 'builder-full-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel du builder ?',
    })
  }

  /** Tutoriel démarré directement depuis la page builder */
  startBuilderOnlyTutorial(): void {
    const steps = this.buildBuilderSteps()
    this.shepherd.startTutorial(steps, {
      tourName: 'builder-only-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel du builder ?',
    })
  }

  private buildTemplateSelectionSteps(): TutorialStep[] {
    return [
      {
        id: 'builder-welcome',
        title: 'Bienvenue dans le tutoriel du builder',
        text: `<div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--brand-text-primary); margin: 0 0 12px 0; font-weight: 600;">
                  De la sélection de modèle à l'exercice publié
                </h3>
                <p style="color: var(--brand-text-secondary); margin: 0 0 20px 0; line-height: 1.5;">
                  Ce tutoriel vous guide à travers le parcours complet de création d'un exercice avec le builder PLaTon.
                </p>
                <div style="background: var(--brand-background-components);
                            border-radius: 8px; padding: 16px; margin: 16px 0;
                            border-left: 3px solid var(--brand-color-primary);">
                  <div style="text-align: left; color: var(--brand-text-primary); font-size: 14px; line-height: 1.8;">
                    Choisir un modèle d'exercice<br>
                    Configurer le contenu et les paramètres<br>
                    Prévisualiser en temps réel<br>
                    Sauvegarder et publier
                  </div>
                </div>
                <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 16px 0 0 0;">
                  Durée : ~3 minutes &nbsp;|&nbsp; Interruptible à tout moment
                </p>
              </div>`,
        buttons: [
          { text: 'Passer', secondary: true, action: () => this.shepherd.cancel() },
          { text: 'Commencer', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'template-selection-overview',
        title: "Sélection du modèle d'exercice",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 La première étape est de choisir un <strong style="color: var(--brand-text-primary);">modèle d'exercice</strong>.
                 Chaque modèle propose une structure pédagogique différente adaptée à votre besoin.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px;
                           padding: 12px; border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-secondary);">
                   Survolez une carte pour voir une démonstration animée de l'exercice.
                 </p>
               </div>`,
        attachTo: { element: '#tuto-template-selection-container', on: 'bottom' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'template-grid',
        title: 'Les modèles disponibles',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Chaque carte représente un type d'exercice certifié et prêt à l'emploi.
                 Elle affiche une image de prévisualisation, une description, et des statistiques d'usage.
               </p>
               <div style="display: flex; flex-direction: column; gap: 8px;">
                 <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                   <strong style="color: var(--brand-text-primary); font-size: 13px;">Image statique / animée</strong><br>
                   <small style="color: var(--brand-text-secondary);">Survolez la carte pour lancer la démonstration</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                   <strong style="color: var(--brand-text-primary); font-size: 13px;">Statistiques d'usage</strong><br>
                   <small style="color: var(--brand-text-secondary);">Exercices créés et sessions jouées à partir de ce modèle</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                   <strong style="color: var(--brand-text-primary); font-size: 13px;">Bouton Aperçu</strong><br>
                   <small style="color: var(--brand-text-secondary);">Testez l'exercice avant de le sélectionner</small>
                 </div>
               </div>`,
        attachTo: { element: '#tuto-template-card-first', on: 'right' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'template-preview',
        title: 'Prévisualiser avant de choisir',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le bouton <strong style="color: var(--brand-text-primary);">Aperçu</strong> ouvre une fenêtre
                 pour tester l'exercice en conditions réelles avant de le sélectionner.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px;
                           padding: 12px; border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-secondary);">
                   Testez plusieurs modèles pour trouver celui qui correspond le mieux à votre exercice.
                 </p>
               </div>`,
        attachTo: { element: '#tuto-template-card-first', on: 'right' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'template-click',
        title: 'Choisissez un modèle pour continuer',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 <strong style="color: var(--brand-text-primary);">Cliquez sur un modèle</strong> pour créer votre exercice
                 et ouvrir le builder. Le tutoriel continuera automatiquement.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez maintenant sur n'importe quelle carte de modèle.
                 </p>
               </div>`,
        attachTo: { element: '#tuto-template-grid', on: 'top' },
        advanceOn: { selector: '#tuto-template-grid', event: 'click' },
        buttons: [{ text: 'Précédent', secondary: true, action: () => this.shepherd.previous() }],
      },
      {
        id: 'builder-loading',
        title: 'Votre exercice est en cours de création...',
        text: `<div style="text-align: center; padding: 16px;">
                 <p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 16px 0;">
                   PLaTon crée votre exercice à partir du modèle choisi et ouvre le <strong style="color: var(--brand-text-primary);">builder</strong>.
                 </p>
                 <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 0;">
                   Cliquez sur <strong>Suivant</strong> dès que le builder est chargé.
                 </p>
               </div>`,
        buttons: [{ text: 'Suivant', action: () => this.shepherd.next() }],
      },
    ]
  }

  private buildBuilderSteps(): TutorialStep[] {
    return [
      {
        id: 'builder-title',
        title: 'Le titre de votre exercice',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le titre identifie votre exercice dans l'espace de travail.
                 <strong style="color: var(--brand-text-primary);">Cliquez dessus</strong> pour le renommer à tout moment.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Un indicateur <em>« Non sauvegardé »</em> apparaît si vous avez des modifications non enregistrées.
                 </small>
               </div>`,
        attachTo: { element: '#tuto-builder-title', on: 'bottom' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-back-btn',
        title: 'Retour aux ressources',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0;">
                 Ce bouton vous ramène à votre espace de travail.
                 Vos modifications sont conservées si vous avez sauvegardé au préalable.
               </p>`,
        attachTo: { element: '#tuto-builder-back-btn', on: 'bottom' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-editor-btn',
        title: "Ouvrir dans l'éditeur de code",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce bouton ouvre l'<strong style="color: var(--brand-text-primary);">IDE PLaTon</strong>,
                 l'éditeur de code avancé pour modifier directement les fichiers de l'exercice.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid var(--brand-color-warning, #f59e0b);">
                 <small style="color: var(--brand-text-secondary);">
                   Réservé aux utilisateurs avancés. Le builder suffit dans la plupart des cas.
                 </small>
               </div>`,
        attachTo: { element: '#tuto-builder-editor-btn', on: 'bottom' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-preview-btn',
        title: 'Prévisualiser en grand écran',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ouvre une <strong style="color: var(--brand-text-primary);">prévisualisation plein écran</strong>
                 de votre exercice, exactement telle qu'un étudiant la verrait.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Utile pour vérifier le rendu final avant de partager l'exercice avec vos étudiants.
                 </small>
               </div>`,
        attachTo: { element: '#tuto-builder-preview-btn', on: 'bottom' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-save-btn',
        title: 'Sauvegarder votre travail',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Enregistre toutes vos modifications. Lors de la <strong style="color: var(--brand-text-primary);">première sauvegarde</strong>,
                 PLaTon vous proposera de configurer les options de publication.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 1px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <small style="color: var(--brand-text-primary);">
                   Raccourci clavier : <strong>Ctrl + S</strong>
                 </small>
               </div>`,
        attachTo: { element: '#tuto-builder-save-btn', on: 'bottom' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-sidebar',
        title: 'La barre latérale',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 La barre latérale gauche contient deux sections essentielles pour configurer votre exercice.
               </p>
               <div style="display: flex; flex-direction: column; gap: 8px;">
                 <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                   <strong style="color: var(--brand-text-primary); font-size: 13px;">Contenu</strong><br>
                   <small style="color: var(--brand-text-secondary);">Les composants configurables de votre exercice</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                   <strong style="color: var(--brand-text-primary); font-size: 13px;">Paramètres</strong><br>
                   <small style="color: var(--brand-text-secondary);">Les réglages globaux de l'exercice</small>
                 </div>
               </div>`,
        attachTo: { element: '#tuto-builder-sidebar', on: 'right' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-content-section',
        title: 'Section Contenu',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 La section <strong style="color: var(--brand-text-primary);">Contenu</strong> liste les éléments
                 que vous pouvez personnaliser dans votre exercice : énoncé, réponse attendue, feedback, etc.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Cliquez sur un élément pour l'éditer dans le panneau central.
                 </small>
               </div>`,
        attachTo: { element: '#tuto-builder-content-section', on: 'right' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-settings-section',
        title: 'Section Paramètres',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 La section <strong style="color: var(--brand-text-primary);">Paramètres</strong> regroupe
                 les réglages globaux : thème d'affichage, mode développeur, options de sauvegarde.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Ces paramètres s'appliquent à l'ensemble de l'exercice.
                 </small>
               </div>`,
        attachTo: { element: '#tuto-builder-settings-section', on: 'right' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-sidebar-toggle',
        title: 'Réduire / étendre la barre latérale',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0;">
                 Ce bouton permet de <strong style="color: var(--brand-text-primary);">masquer ou afficher</strong>
                 la barre latérale pour maximiser l'espace de l'éditeur et de la prévisualisation.
               </p>`,
        attachTo: { element: '#tuto-builder-sidebar-toggle', on: 'right' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-main',
        title: "Le panneau d'édition central",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce panneau affiche le <strong style="color: var(--brand-text-primary);">formulaire de configuration</strong>
                 de l'élément sélectionné dans la barre latérale.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Contenu sélectionné</strong> : formulaire d'édition du composant</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Paramètre sélectionné</strong> : réglages avancés de l'exercice</small>
                 </div>
               </div>`,
        attachTo: { element: '#tuto-builder-main', on: 'top' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-preview',
        title: 'La prévisualisation en temps réel',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce panneau affiche votre exercice en <strong style="color: var(--brand-text-primary);">temps réel</strong>,
                 tel qu'un étudiant le verrait lors d'une session.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   La prévisualisation se met à jour automatiquement à chaque modification.
                 </small>
               </div>`,
        attachTo: { element: '#tuto-builder-preview', on: 'left' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'builder-finish',
        title: 'Tutoriel terminé',
        text: `<div style="text-align: center; padding: 20px;">
                 <h3 style="color: var(--brand-text-primary); margin: 0 0 16px 0;">
                   Vous maîtrisez le builder PLaTon !
                 </h3>
                 <div style="background: var(--brand-background-components); border-radius: 8px;
                             padding: 16px; margin: 16px 0;
                             border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <div style="text-align: left; color: var(--brand-text-secondary); line-height: 1.8;">
                     Sélectionner un modèle d'exercice<br>
                     Naviguer dans l'interface du builder<br>
                     Configurer le contenu et les paramètres<br>
                     Prévisualiser et sauvegarder
                   </div>
                 </div>
                 <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 0;">
                   Vous pouvez relancer ce tutoriel à tout moment via le menu d'aide.
                 </p>
               </div>`,
        buttons: [{ text: 'Terminer', action: () => this.shepherd.complete() }],
      },
    ]
  }
}
