import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { User, UserRoles } from '@platon/core/common';

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
  private readonly shepherdService = inject(ShepherdService);
  private readonly router = inject(Router);

  private selectedResourceType: string | null = null;
  private createResourceParentParam?: string;

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
            text: 'Annuler',
            secondary: true,
            action: () => this.shepherdService.cancel()
          },
          {
            text: 'Commencer le tutoriel',
            action: () => this.shepherdService.next()
          }
        ]
      },
      /*{
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
        ],
        when: {
          show: () => this.highlightCreateButton()
        }
      },*/
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
            text: 'Précédent',
            secondary: true,
            action: () => this.shepherdService.previous()
          },
        ],
        when: {
          show: () => this.highlightCreateButton(),
          hide: () => this.removeHighlight('#tuto-create-menu-container')
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
          show: () => this.waitForMenuToOpen()
        }
      },
      {
        id: 'resource-types-explanation',
        title: 'Types de ressources disponibles',
        text: this.getResourceTypesExplanation(user),
        buttons: [
          {
            text: 'Suivant (Entrée)',
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
            text: 'Je vais choisir moi-même',
            action: () => this.shepherdService.next()
          }
        ],
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
            action: () => this.shepherdService.next()
          }
        ],
        when: {
          show: () => this.waitForResourceSelection(user)
        }
      },
      {
        id: 'tutorial-complete',
        title: 'Félicitations ! 🎉',
        text: `<div style="text-align: center; padding: 20px;">
                 <h3 style="margin-bottom: 16px; color: var(--brand-text-primary);">Excellent travail !</h3>
                 <p style="color: var(--brand-text-secondary); margin-bottom: 20px;">
                   Vous savez maintenant comment créer des ressources sur PLaTon.
                 </p>

                 <div style="background: var(--brand-background-components);
                            border-radius: 8px;
                            padding: 16px;
                            margin: 16px 0;
                            border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <strong style="color: var(--brand-text-primary);">Ce que vous avez appris :</strong>
                   <div style="text-align: left; margin-top: 12px; color: var(--brand-text-secondary);">
                     ✅ Localiser le bouton de création<br>
                     ✅ Ouvrir le menu de création<br>
                     ✅ Comprendre les différents types de ressources<br>
                     ✅ Sélectionner et créer une ressource
                   </div>
                 </div>
               </div>`,
        buttons: [
          {
            text: 'Parfait !',
            action: () => this.shepherdService.complete()
          }
        ]
      }
    ];

    return steps;
  }

  /**
   * Met en évidence le bouton de création
   */
  private highlightCreateButton(): void {
    const createButton = document.querySelector('#tuto-create-menu-container') as HTMLElement;
    if (createButton) {
      createButton.style.transition = 'all 0.3s ease';
      createButton.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5)';
      createButton.style.borderRadius = '8px';
      createButton.style.animation = 'pulseCreateButton 2s ease-in-out infinite';

      this.addCreateButtonAnimation();
    }
  }

  /**
   * Supprime la mise en évidence d'un élément
   */
  private removeHighlight(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.style.boxShadow = '';
      element.style.borderRadius = '';
      element.style.animation = '';
    }
  }

  /**
   * Ajoute l'animation CSS pour le bouton de création
   */
  private addCreateButtonAnimation(): void {
    const styleId = 'tutorial-create-button-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes pulseCreateButton {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(var(--brand-color-primary-rgb), 0.3);
          }
        }
      `;
      document.head.appendChild(style);
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
        return;
      }
      setTimeout(checkMenu, 100);
    };
    checkMenu();
  }


  /**
   * Attend la sélection d'une ressource
   */
  private waitForResourceSelection(user: User): void {
    // Cette étape reste active jusqu'à ce que l'utilisateur clique sur une ressource
    // Les listeners sont déjà configurés dans l'étape précédente
  }





  /**
   * Génère l'explication des types de ressources avec les variables CSS de PLaTon
   */
  private getResourceTypesExplanation(user: User): string {
    let explanation = `<div style="text-align: left; color: var(--brand-text-primary);">
      <p style="margin-bottom: 16px;"><strong>Voici les types de ressources que vous pouvez créer :</strong></p>
      <div style="margin: 15px 0;">`;

    if (user.role === UserRoles.admin || user.role === UserRoles.teacher) {
      explanation += `
        <div style="margin: 10px 0;
                    padding: 12px;
                    background: var(--brand-background-components);
                    border-radius: 8px;
                    border: 1px solid var(--brand-border-color-light);
                    transition: all 0.2s ease;">
          <strong style="color: var(--brand-text-primary);">📚 Cours</strong><br>
          <small style="color: var(--brand-text-secondary);">Un parcours d'apprentissage complet avec des leçons structurées</small>
        </div>`;
    }

    explanation += `
      <div style="margin: 10px 0;
                  padding: 12px;
                  background: var(--brand-background-components);
                  border-radius: 8px;
                  border: 1px solid var(--brand-border-color-light);
                  transition: all 0.2s ease;">
        <strong style="color: var(--brand-text-primary);">🔵 Cercle</strong><br>
        <small style="color: var(--brand-text-secondary);">Organisez vos ressources en groupes thématiques</small>
      </div>

      <div style="margin: 10px 0;
                  padding: 12px;
                  background: var(--brand-background-components);
                  border-radius: 8px;
                  border: 1px solid var(--brand-border-color-light);
                  transition: all 0.2s ease;">
        <strong style="color: var(--brand-text-primary);">🎯 Activité</strong><br>
        <small style="color: var(--brand-text-secondary);">Concevez des exercices interactifs et des projets</small>
      </div>

      <div style="margin: 10px 0;
                  padding: 12px;
                  background: rgba(var(--brand-color-primary-rgb), 0.05);
                  border-radius: 8px;
                  border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);
                  box-shadow: 0 2px 8px rgba(var(--brand-color-primary-rgb), 0.1);">
        <strong style="color: var(--brand-text-primary);">📝 Exercice</strong>
        <span style="color: rgba(var(--brand-color-primary-rgb), 1);
                     font-size: 12px;
                     font-weight: 600;">● RECOMMANDÉ POUR DÉBUTER</span><br>
        <small style="color: var(--brand-text-secondary);">Créez des questions et des problèmes à résoudre</small>
      </div>

      <div style="margin-top: 16px;
                  padding: 12px;
                  background: var(--brand-background-components);
                  border-radius: 8px;
                  border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
        <p style="margin: 0;
                  font-size: 14px;
                  color: var(--brand-text-secondary);">
          <strong style="color: var(--brand-text-primary);">💡 Conseil :</strong>
          Commencez par un exercice pour vous familiariser avec l'interface de création.
        </p>
      </div>
    </div>`;

    return explanation;
  }
}