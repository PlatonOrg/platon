import { Injectable } from '@angular/core';




import { Router } from '@angular/router';
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { User, UserRoles } from '@platon/core/common';

export interface ResourceChoice {
  type: 'COURSE' | 'CIRCLE' | 'ACTIVITY' | 'EXERCISE';
  name: string;
  icon: string;
  description: string;
  route: string;
  queryParams?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ToolbarTutorialService {
  private selectedResourceType: string | null = null;
  constructor(
    private shepherdService: ShepherdService,
    private router: Router
  ) {}



  /**
  * Démarre le tutoriel complet du toolbar
  */
  startToolbarTutorial(user: User): void{
    const steps = this.buildTutorialSteps(user);

    this.shepherdService.startTutorial(steps, {
      tourName: 'toolbar-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de la barre d\'outils ?'
    });

  }

  /**
  * Construit les étapes du tutoriel en fonction de l'utilisateur
  */
  private buildTutorialSteps(user: User): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue dans PLaTon !',
        text: 'Ce tutoriel va vous présenter les fonctionnalités principales de la barre d\'outils. Vous apprendrez à naviguer et à créer des ressources.',
        buttons: [
          {
            text: 'Commencer le tutoriel',
            action: () => this.shepherdService.next()
          },
          {
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel()
          }
        ]
      },
      {
        id: 'menu-button',
        title: 'Menu de navigation',
        text: 'Ce bouton permet d\'ouvrir et fermer le menu de navigation latéral pour accéder aux différentes sections de PLaTon.',
        attachTo: {
          element: '#tuto-toolbar-menu-button',
          on: 'bottom'
        }
      }
    ];

    // Ajouter les étapes selon les permissions de l'utilisateur
    if (this.canUserCreate(user)) {
      steps.push(
        {
          id: 'menu-tutorial',
          title: 'Menu pour les tutoriels',
          text: 'Ce bouton permet de regarder les tutoriels disponibles.',
          attachTo: {
            element: '#tuto-help-button',
            on: 'bottom'
          }
        },
        {
        id: 'create-button',
        title: 'Bouton de création',
        text: 'Ce bouton vous permet de créer de nouvelles ressources : cours, cercles, activités ou exercices.',
        attachTo: {
          element: '#tuto-create-menu-container',
          on: 'bottom'
        }
      });
    }

    steps.push(
      {
        id: 'theme-button',
        title: 'Sélecteur de thème',
        text: 'Personnalisez l\'apparence de PLaTon en choisissant entre le thème clair, sombre ou automatique.',
        attachTo: {
          element: '#tuto-toolbar-theme-button',
          on: 'bottom'
        }
      },
      {
        id: 'notifications',
        title: 'Notifications',
        text: 'Consultez vos notifications et restez informé des dernières activités sur PLaTon.',
        attachTo: {
          element: '#tuto-toolbar-notifications-button',
          on: 'bottom'
        }
      },
      {
        id: 'user-avatar',
        title: 'Menu utilisateur',
        text: 'Accédez à votre profil, vos paramètres de compte et déconnectez-vous depuis ce menu.',
        attachTo: {
          element: 'user-avatar',
          on: 'bottom'
        }
      }
    );

    // Étapes spécifiques pour la création de ressources
    if (this.canUserCreate(user)) {
      steps.push(
        {
          id: 'resource-introduction',
          title: 'Créons une ressource !',
          text: 'Maintenant, découvrons comment créer une ressource. Vous pouvez créer différents types de contenus selon vos besoins pédagogiques.',
          buttons: [
            {
              text: 'Découvrir les ressources',
              action: () => this.shepherdService.next()
            }
          ]
        },
        {
          id: 'resource-explanation',
          title: 'Types de ressources',
          text: this.getResourceExplanationText(user),
          buttons: [
            {
              text: 'Choisir une ressource à créer',
              action: () => this.shepherdService.next()
            }
          ]
        },
        {
          id: 'resource-selection',
          title: 'Quelle ressource voulez-vous créer ?',
          text: this.buildResourceSelectionHTML(user/*, createResourceParentParam*/),
          buttons: [
            {
              text: 'Créer la ressource sélectionnée',
              action: () => this.handleResourceCreation(/*createResourceParentParam*/)
            },
            {
              text: 'Terminer le tutoriel',
              secondary: true,
              action: () => this.shepherdService.complete()
            }
          ],
          when: {
            show: () => this.setupResourceSelection(user/*, createResourceParentParam*/)
          }
        }
      );
    } else {
      steps.push({
        id: 'tutorial-complete',
        title: 'Tutoriel terminé !',
        text: 'Vous connaissez maintenant les principales fonctionnalités de la barre d\'outils PLaTon. Bonne exploration !',
        buttons: [
          {
            text: 'Terminer',
            action: () => this.shepherdService.complete()
          }
        ]
      });
    }

    return steps;
  }

  /**
   * Vérifie si l'utilisateur peut créer des ressources
   */
  private canUserCreate(user: User): boolean {
    return user.role === UserRoles.admin || user.role === UserRoles.teacher;
  }

  /**
   * Génère le texte d'explication des ressources
   */
  private getResourceExplanationText(user: User): string {
    let text = 'Voici les différents types de ressources que vous pouvez créer :</br>';

    if (user.role === UserRoles.admin || user.role === UserRoles.teacher) {
      text += `<nge-markdown>📚 <strong>Cours</strong> : Créez un parcours d\'apprentissage complet avec des leçons structurées\n\n</br></nge-markdown>`;
    }

    text += `<nge-markdown>🔵 <strong>Cercle</strong> : Organisez vos ressources en groupes thématiques\n\n</br></nge-markdown>`;
    text += `<nge-markdown>🎯 <strong>Activité</strong> : Concevez des exercices interactifs et des projets\n\n</br></nge-markdown>`;
    text += `<nge-markdown>📝 <strong>Exercice</strong> : Créez des questions et des problèmes à résoudre</nge-markdown>`;

    return text;
  }

  /**
   * Construit le HTML pour la sélection de ressource
   */
  private buildResourceSelectionHTML(user: User/*, createResourceParentParam?: string*/): string {
    const resources = this.getAvailableResources(user/*, createResourceParentParam*/);

    let html = '<div class="resource-selection-container" style="margin: 20px 0;">';
    html += '<p style="margin-bottom: 16px; font-weight: 500;">Sélectionnez le type de ressource que vous souhaitez créer :</p>';

    resources.forEach((resource, index) => {
      html += `
        <div class="resource-option"
             data-resource-type="${resource.type}"
             style="
               display: flex;
               align-items: center;
               padding: 12px;
               margin: 8px 0;
               border: 2px solid #e1e5e9;
               border-radius: 8px;
               cursor: pointer;
               transition: all 0.2s ease;
             "
             onclick="this.classList.toggle('selected');
                      document.querySelectorAll('.resource-option').forEach(el => {
                        if (el !== this) el.classList.remove('selected');
                      });">
          <div style="
            width: 40px;
            height: 40px;
            background: #f0f2f5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 18px;
          ">
            ${resource.icon}
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${resource.name}</div>
            <div style="font-size: 14px; color: #666;">${resource.description}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    html += `
      <style>
        .resource-option:hover {
          border-color: #1890ff !important;
          background-color: #f6fdff !important;
        }
        .resource-option.selected {
          border-color: #1890ff !important;
          background-color: #e6f7ff !important;
        }
      </style>
    `;

    return html;
  }

  /**
   * Retourne les ressources disponibles selon l'utilisateur
   */
  private getAvailableResources(user: User): ResourceChoice[] {
    const resources: ResourceChoice[] = [];

    if (user.role === UserRoles.admin || user.role === UserRoles.teacher) {
      resources.push({
        type: 'COURSE',
        name: 'Cours',
        icon: '📚',
        description: 'Un parcours d\'apprentissage complet avec des leçons structurées',
        route: '/courses/create'
      });
    }

    resources.push(
      {
        type: 'CIRCLE',
        name: 'Cercle',
        icon: '🔵',
        description: 'Organisez vos ressources en groupes thématiques',
        route: '/resources/create',
        queryParams: { type: 'CIRCLE' }
      },
      {
        type: 'ACTIVITY',
        name: 'Activité',
        icon: '🎯',
        description: 'Concevez des exercices interactifs et des projets',
        route: '/resources/create',
        queryParams: { type: 'ACTIVITY' }
      },
      {
        type: 'EXERCISE',
        name: 'Exercice',
        icon: '📝',
        description: 'Créez des questions et des problèmes à résoudre',
        route: '/resources/create',
        queryParams: { type: 'EXERCISE' }
      }
    );

    return resources;
  }

  /**
   * Configure la sélection de ressource
   */
  private setupResourceSelection(user: User, createResourceParentParam?: string): void {
    setTimeout(() => {
      const options = document.querySelectorAll('.resource-option');
      options.forEach(option => {
        option.addEventListener('click', (event) => {
          const target = event.currentTarget as HTMLElement;
          const resourceType = target.getAttribute('data-resource-type');
          this.selectedResourceType = resourceType;

          // Mettre à jour la sélection visuelle
          options.forEach(opt => opt.classList.remove('selected'));
          target.classList.add('selected');
        });
      });
    }, 100);
  }

  /**
   * Gère la création de la ressource sélectionnée
   */
  private handleResourceCreation(): void {
    if (!this.selectedResourceType) {
      alert('Veuillez sélectionner un type de ressource avant de continuer.');
      return;
    }

    const resources = this.getAvailableResources({ role: UserRoles.teacher } as User);
    const selectedResource = resources.find(r => r.type === this.selectedResourceType);

    if (selectedResource) {
      this.shepherdService.complete();

      // Rediriger vers la création de ressource
      setTimeout(() => {
        if (selectedResource.queryParams) {
          this.router.navigate([selectedResource.route], {
            queryParams: selectedResource.queryParams
          });
        } else {
          this.router.navigate([selectedResource.route]);
        }
      }, 500);
    }
  }

  /**
   * Démarre un tutoriel spécifique pour la création de ressource
   */
  startResourceCreationTutorial(user: User/*, createResourceParentParam?: string*/): void {
    const steps: TutorialStep[] = [
      {
        id: 'resource-creation-intro',
        title: 'Création de ressource',
        text: 'Découvrons comment créer différents types de ressources dans PLaTon.',
      },
      {
        id: 'click-create-button',
        title: 'Cliquez sur le bouton de création',
        text: 'Pour commencer, cliquez sur le bouton "+" pour ouvrir le menu de création.',
        attachTo: {
          element: '#tuto-create-menu-container',
          on: 'bottom'
        },
        advanceOn: {
          selector: '#tuto-create-menu-container',
          event: 'click'
        },
        buttons: []
      },
      {
        id: 'choose-resource-type',
        title: 'Choisissez votre ressource',
        text: 'Sélectionnez le type de ressource que vous souhaitez créer dans le menu qui s\'est ouvert.',
        when: {
          show: () => {
            // Attendre que le menu soit ouvert
            setTimeout(() => {
              const menuItems = document.querySelectorAll('button[mat-menu-item]');
              menuItems.forEach(item => {
                item.addEventListener('click', () => {
                  this.shepherdService.complete();
                });
              });
            }, 100);
          }
        },
        buttons: [
          {
            text: 'J\'ai fait mon choix',
            action: () => this.shepherdService.complete()
          }
        ]
      }
    ];

    this.shepherdService.startTutorial(steps, {
      tourName: 'resource-creation-tutorial',
      useModalOverlay: true
    });
  }


}
