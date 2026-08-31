import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { User, UserRoles } from '@platon/core/common'

export interface ResourceCreationChoice {
  type: 'COURSE' | 'CIRCLE' | 'ACTIVITY' | 'EXERCISE'
  name: string
  icon: string
  description: string
  route: string
  queryParams?: any
  elementId: string
}

@Injectable({
  providedIn: 'root',
})
export class ResourceCreationTutorialService {
  private readonly shepherdService = inject(ShepherdService)
  private readonly router = inject(Router)

  private selectedResourceType: string | null = null
  private createResourceParentParam?: string

  startResourceCreationTutorial(user: User, createResourceParentParam?: string): void {
    this.createResourceParentParam = createResourceParentParam
    const steps = this.buildTutorialSteps(user)

    this.shepherdService.startTutorial(steps, {
      tourName: 'resource-creation-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de création de ressource ?',
    })
  }

  private buildTutorialSteps(user: User): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome-creation',
        title: 'Créer une ressource pédagogique',
        text: `<div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--brand-text-primary); margin: 0 0 12px 0; font-weight: 600;">
                  Qu'allez-vous apprendre ?
                </h3>
                <p style="color: var(--brand-text-secondary); margin: 0 0 20px 0; line-height: 1.5;">
                  Ce tutoriel vous guide pas à pas pour créer votre première ressource sur PLaTon.
                </p>
                <div style="background: var(--brand-background-components);
                            border-radius: 8px; padding: 16px; margin: 16px 0;
                            border-left: 3px solid var(--brand-color-primary);">
                  <div style="text-align: left; color: var(--brand-text-primary); font-size: 14px; line-height: 1.8;">
                    Accéder au menu de création<br>
                    Comprendre les différents types de ressources<br>
                    Choisir le type adapté à votre besoin
                  </div>
                </div>
                <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 16px 0 0 0;">
                  Durée : ~2 minutes &nbsp;|&nbsp; Interruptible à tout moment
                </p>
              </div>`,
        buttons: [
          {
            text: 'Annuler',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
          {
            text: 'Commencer',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'click-create-button',
        title: 'Le bouton de création',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce bouton <strong style="color: var(--brand-text-primary);">+</strong> en haut de la page est
                 le point d'entrée pour créer n'importe quelle ressource pédagogique sur PLaTon.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez maintenant sur le bouton <strong>+</strong> pour ouvrir le menu de création.
                 </p>
               </div>`,
        attachTo: {
          element: '#tuto-create-menu-container',
          on: 'bottom',
        },
        advanceOn: {
          selector: '#tuto-create-menu-container',
          event: 'click',
        },
        buttons: [
          {
            text: 'Précédent',
            secondary: true,
            action: () => this.shepherdService.previous(),
          },
        ],
        when: {
          show: () => this.highlightCreateButton(),
          hide: () => this.removeHighlight('#tuto-create-menu-container'),
        },
      },
      {
        id: 'menu-opened',
        title: 'Le menu de création est ouvert',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le menu liste tous les types de ressources que vous pouvez créer.
                 Chaque type correspond à un usage pédagogique précis.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   Dans l'étape suivante, vous découvrirez ce que représente chaque type de ressource.
                 </small>
               </div>`,
        buttons: [
          {
            text: 'Découvrir les types',
            action: () => this.shepherdService.next(),
          },
        ],
        when: {
          show: () => this.waitForMenuToOpen(),
        },
      },
      {
        id: 'resource-types-explanation',
        title: 'Les types de ressources',
        text: this.getResourceTypesExplanation(user),
        buttons: [
          {
            text: 'Suivant',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'choose-resource-type',
        title: 'Faites votre choix',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cliquez sur le type de ressource que vous souhaitez créer dans le menu.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 12px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-secondary);">
                   Pour commencer, nous recommandons de créer un <strong style="color: var(--brand-text-primary);">Exercice</strong> :
                   c'est le type le plus simple à prendre en main.
                 </p>
               </div>`,
        buttons: [
          {
            text: 'Je vais choisir',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'wait-for-selection',
        title: 'En attente de votre sélection',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cliquez sur le type de ressource que vous souhaitez créer.
                 Vous serez redirigé automatiquement vers le formulaire de création.
               </p>`,
        buttons: [
          {
            text: 'Terminer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.next(),
          },
        ],
        when: {
          show: () => this.waitForResourceSelection(user),
        },
      },
      {
        id: 'tutorial-complete',
        title: 'Tutoriel terminé',
        text: `<div style="text-align: center; padding: 20px;">
                 <h3 style="color: var(--brand-text-primary); margin: 0 0 16px 0;">
                   Vous savez créer des ressources sur PLaTon !
                 </h3>
                 <div style="background: var(--brand-background-components); border-radius: 8px;
                             padding: 16px; margin: 16px 0;
                             border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <div style="text-align: left; color: var(--brand-text-secondary); line-height: 1.8;">
                     Localiser le bouton de création<br>
                     Ouvrir le menu de création<br>
                     Comprendre les différents types de ressources<br>
                     Sélectionner et créer une ressource
                   </div>
                 </div>
               </div>`,
        buttons: [
          {
            text: 'Terminer',
            action: () => this.shepherdService.complete(),
          },
        ],
      },
    ]

    return steps
  }

  private highlightCreateButton(): void {
    const createButton = document.querySelector('#tuto-create-menu-container') as HTMLElement
    if (createButton) {
      createButton.style.transition = 'all 0.3s ease'
      createButton.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5)'
      createButton.style.borderRadius = '8px'
      createButton.style.animation = 'pulseCreateButton 2s ease-in-out infinite'

      this.addCreateButtonAnimation()
    }
  }

  private removeHighlight(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.style.boxShadow = ''
      element.style.borderRadius = ''
      element.style.animation = ''
    }
  }

  private addCreateButtonAnimation(): void {
    const styleId = 'tutorial-create-button-animation'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @keyframes pulseCreateButton {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(var(--brand-color-primary-rgb), 0.3);
          }
        }
      `
      document.head.appendChild(style)
    }
  }

  private verifyMenuOpenedAndAdvance(): void {
    const menu = document.querySelector('#tuto-action-menu')
    const menuPanel = document.querySelector('.mat-menu-panel')

    if ((menu && this.isElementVisible(menu)) || (menuPanel && this.isElementVisible(menuPanel))) {
      this.shepherdService.next()
    } else {
      this.shepherdService.next()
    }
  }

  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  private waitForMenuToOpen(): void {
    const checkMenu = () => {
      const menu = document.querySelector('#tuto-action-menu')
      if (menu && menu.classList.contains('mat-menu-panel')) {
        return
      }
      setTimeout(checkMenu, 100)
    }
    checkMenu()
  }

  private waitForResourceSelection(_user: User): void {
    // Cette étape reste active jusqu'à ce que l'utilisateur clique sur une ressource
  }

  private getResourceTypesExplanation(user: User): string {
    let explanation = `<div style="text-align: left; color: var(--brand-text-primary);">
      <p style="margin-bottom: 16px; color: var(--brand-text-secondary);">
        Choisissez le type de ressource selon votre objectif pédagogique :
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px;">`

    if (user.role === UserRoles.admin || user.role === UserRoles.teacher) {
      explanation += `
        <div style="padding: 12px;
                    background: var(--brand-background-components);
                    border-radius: 8px;
                    border: 1px solid var(--brand-border-color-light);">
          <strong style="color: var(--brand-text-primary);">Cours</strong><br>
          <small style="color: var(--brand-text-secondary);">Un parcours d'apprentissage structuré avec des leçons et activités</small>
        </div>`
    }

    explanation += `
      <div style="padding: 12px;
                  background: var(--brand-background-components);
                  border-radius: 8px;
                  border: 1px solid var(--brand-border-color-light);">
        <strong style="color: var(--brand-text-primary);">Cercle</strong><br>
        <small style="color: var(--brand-text-secondary);">Un espace pour regrouper et organiser vos ressources par thème</small>
      </div>

      <div style="padding: 12px;
                  background: var(--brand-background-components);
                  border-radius: 8px;
                  border: 1px solid var(--brand-border-color-light);">
        <strong style="color: var(--brand-text-primary);">Activité</strong><br>
        <small style="color: var(--brand-text-secondary);">Un ensemble d'exercices regroupés pour une séance ou une évaluation</small>
      </div>

      <div style="padding: 12px;
                  background: rgba(var(--brand-color-primary-rgb), 0.05);
                  border-radius: 8px;
                  border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
        <strong style="color: var(--brand-text-primary);">Exercice</strong>
        <span style="color: rgba(var(--brand-color-primary-rgb), 1);
                     font-size: 11px;
                     font-weight: 600;
                     margin-left: 6px;">RECOMMANDÉ POUR DÉBUTER</span><br>
        <small style="color: var(--brand-text-secondary);">Une question ou un problème interactif à faire résoudre par vos étudiants</small>
      </div>

      </div>
    </div>`

    return explanation
  }
}
