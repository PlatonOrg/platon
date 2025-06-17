import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { User, UserRoles, isTeacherRole } from '@platon/core/common';

export interface ResourceCreationChoice {
  type: 'COURSE' | 'CIRCLE' | 'ACTIVITY' | 'EXERCISE';
  name: string;
  icon: string;
  description: string;
  route: string;
  queryParams?: any;
  elementId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResourceCreationTutorialService {
  private selectedResourceType: string | null = null;
  private createResourceParentParam?: string;

  constructor(
    private shepherdService: ShepherdService,
    private router: Router
  ) {}

  /**
   * Démarre le tutoriel complet de création de ressource
   */
  startResourceCreationTutorial(user: User, createResourceParentParam?: string): void {
    this.createResourceParentParam = createResourceParentParam;
    const steps = this.buildTutorialSteps(user);

    this.shepherdService.startTutorial(steps, {
      tourName: 'resource-creation-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de création de ressource ?'
    });
  }

  /**
   * Construit les étapes du tutoriel
   */
  private buildTutorialSteps(user: User): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome-creation',
        title: 'Créons une ressource ensemble !',
        text: `Bienvenue dans le tutoriel de création de ressource. Je vais vous guider pour créer votre première ressource sur PLaTon.<br><br>
               <strong>Qu'allez-vous apprendre ?</strong><br>
               • Comment accéder au menu de création<br>
               • Les différents types de ressources disponibles<br>
               • Comment choisir le bon type selon vos besoins`,
        buttons: [
          {
            text: 'Commencer le tutoriel',
            action: () => this.shepherdService.next()
          },
          {
            text: 'Annuler',
            secondary: true,
            action: () => this.shepherdService.cancel()
          }
        ]
      },
      {
        id: 'locate-create-button',
        title: 'Trouvez le bouton de création',
        text: `Pour créer une ressource, vous devez d'abord cliquer sur le bouton <strong>+</strong> (plus) dans la barre d'outils.<br><br>
               Ce bouton bleu se trouve en haut de la page et vous donne accès à toutes les options de création.`,
        attachTo: {
          element: '#tuto-create-menu-container',
          on: 'bottom'
        },
        buttons: [
          {
            text: 'J\'ai trouvé le bouton',
            action: () => this.shepherdService.next()
          }
        ]
      },
      {
        id: 'click-create-button',
        title: 'Cliquez sur le bouton +',
        text: `Parfait ! Maintenant, cliquez sur ce bouton <strong>+</strong> pour ouvrir le menu de création.<br><br>
               <em>💡 Astuce : Ce menu vous permettra de créer différents types de ressources selon vos besoins pédagogiques.</em>`,
        attachTo: {
          element: '#tuto-create-menu-container',
          on: 'bottom'
        },
        advanceOn: {
          selector: '#tuto-create-menu-container',
          event: 'click'
        },
        buttons: [
          {
            text: 'Ouvrir le menu pour moi',
            action: () => this.openCreateMenuAndAdvance()
          },
          {
            text: 'Précédent',
            secondary: true,
            action: () => this.shepherdService.previous()
          }
        ],
        when: {
          show: () => {
            // S'assurer que le menu n'est pas déjà ouvert
          }
        }
      },
      {
        id: 'menu-opened',
        title: 'Excellent ! Menu ouvert',
        text: `Bravo ! Le menu de création est maintenant ouvert. Vous pouvez voir les différents types de ressources que vous pouvez créer.<br><br>
               Dans la prochaine étape, nous allons découvrir chaque type de ressource.`,
        buttons: [
          {
            text: 'Découvrir les ressources',
            action: () => this.shepherdService.next()
          }
        ],
        when: {
          show: () => {
            // Attendre que le menu soit visible
            this.waitForMenuToOpen();
          }
        }
      },
      {
        id: 'resource-types-explanation',
        title: 'Types de ressources disponibles',
        text: this.getResourceTypesExplanation(user),
        buttons: [
          {
            text: 'Choisir une ressource',
            action: () => this.shepherdService.next()
          }
        ]
      },
      {
        id: 'choose-resource-type',
        title: 'À vous de choisir !',
        text: `Maintenant, choisissez le type de ressource que vous souhaitez créer en cliquant sur l'une des options du menu.<br><br>
               <strong>Conseil :</strong> Pour commencer, je recommande de créer un <strong>Exercice</strong> car c'est le plus simple à prendre en main.`,
        buttons: [
          {
            text: 'Créer un exercice (recommandé)',
            action: () => this.createRecommendedResource(user)
          },
          {
            text: 'Je vais choisir moi-même',
            secondary: true,
            action: () => this.shepherdService.next()
          }
        ],
        when: {
          show: () => this.setupResourceMenuListeners(user)
        }
      },
      {
        id: 'wait-for-selection',
        title: 'En attente de votre choix...',
        text: `Cliquez sur le type de ressource que vous souhaitez créer dans le menu.<br><br>
               Une fois que vous aurez cliqué, vous serez automatiquement redirigé vers le formulaire de création.`,
        buttons: [
          {
            text: 'Terminer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.complete()
          }
        ],
        when: {
          show: () => this.waitForResourceSelection(user)
        }
      }
    ];

    return steps;
  }

  /**
   * Ouvre automatiquement le menu de création et passe à l'étape suivante
   */
  private openCreateMenuAndAdvance(): void {
    // Méthode 1: Essayer de cliquer sur le bouton directement
    const createButton = document.querySelector('#tuto-create-menu-container') as HTMLElement;
    if (createButton) {

      // Simuler un clic sur le bouton
      createButton.click();

      setTimeout(() => {
        this.verifyMenuOpenedAndAdvance();
      }, 300);
    }
  }

  /**
   * Vérifie que le menu est ouvert et passe à l'étape suivante
   */
  private verifyMenuOpenedAndAdvance(): void {
    const menu = document.querySelector('#tuto-action-menu');
    const menuPanel = document.querySelector('.mat-menu-panel');

    if ((menu && this.isElementVisible(menu)) || (menuPanel && this.isElementVisible(menuPanel))) {
      this.shepherdService.next();
    } else {
      // Passer à l'étape suivante même si on ne détecte pas le menu
      // (il se peut que le menu soit ouvert mais pas encore détectable)
      this.shepherdService.next();
    }
  }

  /**
   * Vérifie si un élément est visible
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Attend que le menu de création soit ouvert
   */
  private waitForMenuToOpen(): void {
    const checkMenu = () => {
      const menu = document.querySelector('#tuto-action-menu');
      if (menu && menu.classList.contains('mat-menu-panel')) {
        return; // Menu ouvert
      }
      setTimeout(checkMenu, 100);
    };
    checkMenu();
  }

  /**
   * Configure les listeners pour les éléments du menu de ressources
   */
  private setupResourceMenuListeners(user: User): void {
    setTimeout(() => {
      const resourceItems = [
        '#tuto-create-course',
        '#tuto-create-circle',
        '#tuto-create-activity',
        '#tuto-create-exercise'
      ];

      resourceItems.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.addEventListener('click', () => {
            console.log(`Resource selected: ${selector}`);
            this.shepherdService.complete();

            // Message de félicitation
            setTimeout(() => {
              this.showCompletionMessage();
            }, 1000);
          });
        }
      });
    }, 200);
  }

  /**
   * Attend la sélection d'une ressource
   */
  private waitForResourceSelection(user: User): void {
    // Cette étape reste active jusqu'à ce que l'utilisateur clique sur une ressource
    // Les listeners sont déjà configurés dans l'étape précédente
  }

  /**
   * Crée la ressource recommandée (exercice)
   */
  private createRecommendedResource(user: User): void {
    this.shepherdService.complete();

    setTimeout(() => {
      const exerciseButton = document.querySelector('#tuto-create-exercise') as HTMLElement;
      if (exerciseButton) {
        exerciseButton.click();
      } else {
        // Fallback: navigation directe
        const queryParams = this.createResourceParentParam
          ? { type: 'EXERCISE', parent: this.createResourceParentParam }
          : { type: 'EXERCISE' };
        this.router.navigate(['/resources/create'], { queryParams });
      }

      this.showCompletionMessage();
    }, 500);
  }

  /**
   * Affiche un message de fin de tutoriel
   */
  private showCompletionMessage(): void {
    const completionSteps: TutorialStep[] = [
      {
        id: 'tutorial-complete',
        title: 'Félicitations ! 🎉',
        text: `Excellent travail ! Vous savez maintenant comment créer des ressources sur PLaTon.<br><br>
               <strong>Ce que vous avez appris :</strong><br>
               ✅ Localiser le bouton de création<br>
               ✅ Ouvrir le menu de création<br>
               ✅ Comprendre les différents types de ressources<br>
               ✅ Sélectionner et créer une ressource<br><br>
               Vous allez maintenant être redirigé vers le formulaire de création. Bonne création !`,
        buttons: [
          {
            text: 'Parfait !',
            action: () => this.shepherdService.complete()
          }
        ]
      }
    ];

    this.shepherdService.startTutorial(completionSteps, {
      tourName: 'resource-creation-completion',
      useModalOverlay: false
    });
  }

  /**
   * Génère l'explication des types de ressources
   */
  private getResourceTypesExplanation(user: User): string {
    let explanation = `<div style="text-align: left;">
      <p><strong>Voici les types de ressources que vous pouvez créer :</strong></p>
      <div style="margin: 15px 0;">`;

    if (user.role === UserRoles.admin || user.role === UserRoles.teacher) {
      explanation += `
        <div style="margin: 10px 0; padding: 8px; background: #f0f8ff; border-radius: 4px;">
          <strong>📚 Cours</strong><br>
          <small>Un parcours d'apprentissage complet avec des leçons structurées</small>
        </div>`;
    }

    explanation += `
      <div style="margin: 10px 0; padding: 8px; background: #f0f8ff; border-radius: 4px;">
        <strong>🔵 Cercle</strong><br>
        <small>Organisez vos ressources en groupes thématiques</small>
      </div>
      <div style="margin: 10px 0; padding: 8px; background: #f0f8ff; border-radius: 4px;">
        <strong>🎯 Activité</strong><br>
        <small>Concevez des exercices interactifs et des projets</small>
      </div>
      <div style="margin: 10px 0; padding: 8px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffeaa7;">
        <strong>📝 Exercice</strong> <span style="color: #d63031; font-size: 12px;">● RECOMMANDÉ POUR DÉBUTER</span><br>
        <small>Créez des questions et des problèmes à résoudre</small>
      </div>
    </div>`;

    return explanation;
  }

  /**
   * Démarre un tutoriel rapide pour un type de ressource spécifique
   */
  startQuickResourceTutorial(
    resourceType: 'COURSE' | 'CIRCLE' | 'ACTIVITY' | 'EXERCISE',
    user: User
  ): void {
    const resourceInfo = this.getResourceInfo(resourceType);

    const steps: TutorialStep[] = [
      {
        id: `quick-${resourceType.toLowerCase()}`,
        title: `Création de ${resourceInfo.name}`,
        text: `${resourceInfo.description}<br><br>Cliquez sur le bouton + puis sélectionnez "${resourceInfo.name}" pour commencer.`,
        attachTo: {
          element: '#tuto-create-menu-container',
          on: 'bottom'
        }
      }
    ];

    this.shepherdService.startTutorial(steps, {
      tourName: `quick-${resourceType.toLowerCase()}-tutorial`,
      useModalOverlay: false
    });
  }

  /**
   * Obtient les informations d'un type de ressource
   */
  private getResourceInfo(type: string): { name: string; description: string } {
    const resourceMap = {
      'COURSE': {
        name: 'Cours',
        description: 'Un cours est un parcours d\'apprentissage complet avec des leçons structurées.'
      },
      'CIRCLE': {
        name: 'Cercle',
        description: 'Un cercle permet d\'organiser vos ressources en groupes thématiques.'
      },
      'ACTIVITY': {
        name: 'Activité',
        description: 'Une activité est un exercice interactif ou un projet à réaliser.'
      },
      'EXERCISE': {
        name: 'Exercice',
        description: 'Un exercice contient des questions et des problèmes à résoudre.'
      }
    };

    return resourceMap[type as keyof typeof resourceMap] || { name: 'Ressource', description: 'Une ressource pédagogique.' };
  }

  /**
   * Vérifie si l'utilisateur peut créer un type de ressource spécifique
   */
  private canUserCreateResourceType(user: User, type: string): boolean {
    switch (type) {
      case 'COURSE':
        return user.role === UserRoles.admin || user.role === UserRoles.teacher;
      case 'CIRCLE':
      case 'ACTIVITY':
      case 'EXERCISE':
        return isTeacherRole(user.role) || user.role === UserRoles.admin;
      default:
        return false;
    }
  }

  /**
   * Démarre un tutoriel contextuel selon la page actuelle
   */
  startContextualTutorial(user: User, currentRoute: string): void {
    if (currentRoute.includes('/resources')) {
      this.startResourceCreationTutorial(user);
    } else {
      // Rediriger vers la page appropriée puis lancer le tutoriel
      this.router.navigate(['/dashboard']).then(() => {
        setTimeout(() => {
          this.startResourceCreationTutorial(user);
        }, 1000);
      });
    }
  }
}