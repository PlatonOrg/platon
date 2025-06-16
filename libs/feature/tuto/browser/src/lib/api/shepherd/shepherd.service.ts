import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';
import { Subject } from 'rxjs';

// import '../../styles/shepherd-override.css';

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  attachTo?: {
    element: string;
    on: 'top' | 'bottom' | 'left' | 'right' | 'center';
  };
  buttons?: Array<{
    text: string;
    action?: () => void;
    classes?: string;
    secondary?: boolean;
  }>;
  when?: {
    show?: () => void;
    hide?: () => void;
    complete?: () => void;
    cancel?: () => void;
  };
  advanceOn?: {
    selector: string;
    event: string;
  };
  canClickTarget?: boolean;
  scrollTo?: boolean;
  modalOverlayOpeningPadding?: number;
  modalOverlayOpeningRadius?: number;
}

export interface TutorialOptions {
  useModalOverlay?: boolean;
  exitOnEsc?: boolean;
  keyboardNavigation?: boolean;
  confirmCancel?: boolean;
  confirmCancelMessage?: string;
  tourName?: string;
  classPrefix?: string;
  enableEnterNavigation?: boolean; // Nouvelle option
}

@Injectable({
  providedIn: 'root'
})
export class ShepherdService {
  private currentTour: Shepherd.Tour | null = null;
  private keyboardListener: ((event: KeyboardEvent) => void) | null = null;

  private tourEndedSubject = new Subject<void>();
  public tourEnded$ = this.tourEndedSubject.asObservable();

  private defaultOptions: TutorialOptions = {
    useModalOverlay: true,
    exitOnEsc: true,
    keyboardNavigation: true,
    confirmCancel: true,
    confirmCancelMessage: 'Êtes-vous sûr de vouloir quitter le tutoriel ?',
    tourName: 'tutorial',
    classPrefix: 'shepherd',
    enableEnterNavigation: true // Activé par défaut
  };

  constructor() {}

  /**
   * Démarre un nouveau tutoriel
   */
  startTutorial(steps: TutorialStep[], options?: TutorialOptions): void {
    // Arrêter le tutoriel actuel s'il existe
    this.stopTutorial();

    const mergedOptions = { ...this.defaultOptions, ...options };

    this.currentTour = new Shepherd.Tour({
      useModalOverlay: mergedOptions.useModalOverlay,
      tourName: mergedOptions.tourName,
      classPrefix: mergedOptions.classPrefix,
      exitOnEsc: mergedOptions.exitOnEsc,
      keyboardNavigation: mergedOptions.keyboardNavigation,
      confirmCancel: false,//mergedOptions.confirmCancel,
      confirmCancelMessage: mergedOptions.confirmCancelMessage,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true
        },
        scrollTo: {
          behavior: 'smooth',
          block: 'center'
        },
        modalOverlayOpeningPadding: 4,
        modalOverlayOpeningRadius: 4
      }
    });

    // Ajouter les étapes
    steps.forEach(step => this.addStep(step));

    // Événements globaux du tour
    this.currentTour.on('start', () => {
      console.log('Tutoriel démarré');
      document.body.classList.add('shepherd-active');

      // Configurer la navigation par Entrée si activée
      if (mergedOptions.enableEnterNavigation) {
        this.setupEnterNavigation();
      }
    });

    this.currentTour.on('complete', () => {
      document.body.classList.remove('shepherd-active');
      this.removeEnterNavigation();
      this.tourEndedSubject.next();
      this.currentTour = null;
    });

    this.currentTour.on('cancel', () => {
      document.body.classList.remove('shepherd-active');
      this.removeEnterNavigation();
      this.tourEndedSubject.next();
      this.currentTour = null;
    });

    // Démarrer le tutoriel
    this.currentTour.start();
  }

  /**
   * Configure la navigation avec la touche Entrée
   */
  private setupEnterNavigation(): void {
    this.removeEnterNavigation(); // S'assurer qu'il n'y a pas de listener existant

    this.keyboardListener = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && this.currentTour) {
        // Vérifier si nous sommes sur la dernière étape
        const currentStep = this.currentTour.getCurrentStep();
        if (currentStep) {
          const currentStepIndex = this.currentTour.steps.findIndex(step => step.id === currentStep.id);
          const isLastStep = currentStepIndex === this.currentTour.steps.length - 1;

          if (isLastStep) {
            this.complete();
          } else {
            this.next();
          }
        }
      }
    };

    document.addEventListener('keydown', this.keyboardListener, true);
  }

  /**
   * Supprime le listener de navigation par Entrée
   */
  private removeEnterNavigation(): void {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener, true);
      this.keyboardListener = null;
    }
  }

  /**
   * Ajoute une étape au tutoriel
   */
  private addStep(stepConfig: TutorialStep): void {
    if (!this.currentTour) return;

    const buttons = this.createButtons(stepConfig.buttons);

    const stepOptions: any = {
      id: stepConfig.id,
      title: stepConfig.title,
      text: stepConfig.text,
      buttons: buttons,
      when: stepConfig.when || {},
      canClickTarget: stepConfig.canClickTarget ?? true
    };

    // Configuration de l'attachement
    if (stepConfig.attachTo) {
      stepOptions.attachTo = {
        element: stepConfig.attachTo.element,
        on: stepConfig.attachTo.on
      };
    }

    // Configuration de l'avancement automatique
    if (stepConfig.advanceOn) {
      stepOptions.advanceOn = stepConfig.advanceOn;
    }

    // Configuration du scroll
    if (stepConfig.scrollTo !== undefined) {
      stepOptions.scrollTo = stepConfig.scrollTo;
    }

    // Configuration du modal overlay
    if (stepConfig.modalOverlayOpeningPadding !== undefined) {
      stepOptions.modalOverlayOpeningPadding = stepConfig.modalOverlayOpeningPadding;
    }

    if (stepConfig.modalOverlayOpeningRadius !== undefined) {
      stepOptions.modalOverlayOpeningRadius = stepConfig.modalOverlayOpeningRadius;
    }

    this.currentTour.addStep(stepOptions);
  }

  /**
   * Crée les boutons pour une étape
   */
  private createButtons(customButtons?: Array<{text: string, action?: () => void, classes?: string, secondary?: boolean}>): Array<any> {
    if (customButtons && customButtons.length > 0) {
      return customButtons.map(button => ({
        text: button.text,
        classes: `shepherd-button ${button.classes || ''} ${button.secondary ? 'shepherd-button-secondary' : 'shepherd-button-primary'}`,
        action: button.action || (() => this.next())
      }));
    }

    // Boutons par défaut
    const currentStepIndex = this.currentTour?.getCurrentStep()?.options?.id;
    const totalSteps = this.currentTour?.steps?.length || 0;
    const isFirstStep = this.currentTour?.steps?.findIndex(step => step.id === currentStepIndex) === 0;
    const isLastStep = this.currentTour?.steps?.findIndex(step => step.id === currentStepIndex) === totalSteps - 1;

    const buttons = [];

    // Bouton Précédent (sauf pour la première étape)
    if (!isFirstStep) {
      buttons.push({
        text: 'Précédent',
        classes: 'shepherd-button shepherd-button-secondary',
        action: () => this.previous()
      });
    }

    // Bouton Suivant/Terminer avec indication de la touche Entrée
    buttons.push({
      text: isLastStep ? 'Terminer (Entrée)' : 'Suivant (Entrée)',
      classes: 'shepherd-button shepherd-button-primary',
      action: isLastStep ? () => this.complete() : () => this.next()
    });

    return buttons;
  }

  /**
  * Passe à l'étape suivante
  */
  next(): void {
    this.currentTour?.next();
  }

  /**
  * Revient à l'étape précédente
  */
  previous(): void {
    this.currentTour?.back();
  }

  /**
  * Complète le tutoriel
  */
  complete(): void {
    this.currentTour?.complete();
  }

  /**
   * Annule le tutoriel
   */
  cancel(): void {
    this.currentTour?.cancel();
  }

  /**
   * Arrête le tutoriel actuel
   */
  stopTutorial(): void {
    if (this.currentTour) {
      this.removeEnterNavigation();
      this.currentTour.cancel();
      this.currentTour = null;
    }
  }

  /**
   * Va à une étape spécifique
   */
  goToStep(stepId: string): void {
    const step = this.currentTour?.steps?.find(s => s.id === stepId);
    if (step) {
      this.currentTour?.show(stepId);
    }
  }

  /**
   * Vérifie si un tutoriel est en cours
   */
  isActive(): boolean {
    return this.currentTour !== null;
  }

  /**
   * Retourne l'étape actuelle
   */
  getCurrentStep(): any {
    return this.currentTour?.getCurrentStep();
  }

  /**
   * Méthodes utilitaires pour créer des tutoriels prédéfinis
   */

  /**
   * Tutoriel d'introduction simple
   */
  startIntroTutorial(): void {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue !',
        text: 'Nous allons vous faire découvrir les fonctionnalités principales de cette application.<br><small>💡 Utilisez les flèches ← → ou la touche Entrée pour naviguer</small>',
        buttons: [
          {
            text: 'Commencer (Entrée)',
            action: () => this.next()
          },
          {
            text: 'Passer',
            secondary: true,
            action: () => this.cancel()
          }
        ]
      }
    ];

    this.startTutorial(steps, {
      tourName: 'intro-tutorial'
    });
  }

  /**
  * Tutoriel avec interaction obligatoire
  */
  startInteractiveTutorial(targetElement: string, actionDescription: string, onComplete?: () => void): void {
    const steps: TutorialStep[] = [
      {
        id: 'interactive-step',
        title: 'Action requise',
        text: actionDescription,
        attachTo: {
          element: targetElement,
          on: 'bottom'
        },
        advanceOn: {
          selector: targetElement,
          event: 'click'
        },
        buttons: [], // Pas de boutons, avancement automatique
        when: {
          complete: onComplete
        }
      }
    ];

    this.startTutorial(steps, {
      tourName: 'interactive-tutorial',
      confirmCancel: false
    });
  }

  /**
  * Tutoriel avec validation personnalisée
  */
  startValidatedTutorial(
    targetElement: string,
    description: string,
    validationFn: () => boolean,
    onValidation?: () => void
  ): void {
    const checkAndProceed = () => {
      if (validationFn()) {
        if (onValidation) onValidation();
        this.next();
      } else {
        // Optionnel: afficher un message d'erreur
        console.log('Validation échouée, veuillez compléter l\'action requise.');
      }
    };

    const steps: TutorialStep[] = [
      {
        id: 'validated-step',
        title: 'Étape avec validation',
        text: description + '<br><small>💡 Appuyez sur Entrée pour vérifier et continuer</small>',
        attachTo: {
          element: targetElement,
          on: 'bottom'
        },
        buttons: [
          {
            text: 'Vérifier et continuer (Entrée)',
            action: checkAndProceed
          }
        ]
      }
    ];

    this.startTutorial(steps, {
      tourName: 'validated-tutorial'
    });
  }

  /**
   * Désactive temporairement la navigation par Entrée
   */
  disableEnterNavigation(): void {
    this.removeEnterNavigation();
  }

  /**
   * Réactive la navigation par Entrée
   */
  enableEnterNavigation(): void {
    if (this.currentTour && !this.keyboardListener) {
      this.setupEnterNavigation();
    }
  }
}