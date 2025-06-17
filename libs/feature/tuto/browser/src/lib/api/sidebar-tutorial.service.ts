import { Injectable } from '@angular/core';
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { User, UserRoles, isTeacherRole } from '@platon/core/common';
import { Router, RouterModule } from '@angular/router'


export interface NavigationChoice {
  title: string;
  url: string;
  icon: string;
  description: string;
  queryParams?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class SidebarTutorialService {
  private selectedNavigation: string | null = null;
  private user: User | null = null;

  constructor(
    private shepherdService: ShepherdService,
    private router: Router
  ) {}

  /**
   * Démarre le tutoriel complet de la sidebar
   */
  startSidebarTutorial(
    user: User,
  ): void {
    this.user = user;
    const steps = this.buildTutorialSteps(user);

    this.shepherdService.startTutorial(steps, {
      tourName: 'sidebar-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de navigation ?'
    });
  }

  /**
   * Construit les étapes du tutoriel en fonction de l'utilisateur
   * Texte adapté pour les enseignants et administrateurs
   */
  private buildTutorialSteps(
    user: User
  ): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue dans la navigation PLaTon !',
        text: 'Ce tutoriel va vous présenter les différentes sections de l\'interface enseignant. Découvrons ensemble comment naviguer efficacement dans PLaTon pour gérer vos cours et ressources.',
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
        id: 'logo',
        title: 'Logo PLaTon',
        text: 'Le logo PLaTon vous permet de revenir rapidement au tableau de bord depuis n\'importe quelle page, vous donnant un accès rapide à toutes les fonctionnalités essentielles.',
        attachTo: {
          element: '#tuto-sidebar-logo',
          on: 'right'
        }
      },
      {
        id: 'dashboard',
        title: 'Tableau de bord',
        text: 'Le tableau de bord est votre centre de contrôle. Vous y retrouvez un résumé de l\'activité de vos cours, les statistiques d\'utilisation et les dernières notifications importantes.',
        attachTo: {
          element: '#tuto-sidebar-tableau-de-bord',
          on: 'right'
        }
      },
      {
        id: 'courses',
        title: 'Section Cours',
        text: 'Gérez tous vos cours, créez de nouvelles sessions et suivez la progression de vos étudiants. C\'est ici que vous organisez votre enseignement et structurez votre contenu pédagogique.',
        attachTo: {
          element: '#tuto-sidebar-cours',
          on: 'right'
        }
      },
      {
        id: 'corrections',
        title: 'Corrections',
        text: 'Accédez aux travaux de vos étudiants qui nécessitent une évaluation manuelle. Vous pouvez y fournir des retours détaillés et attribuer des notes pour les exercices non auto-évalués.',
        attachTo: {
          element: '#tuto-sidebar-corrections',
          on: 'right'
        }
      }
    ];

    // Ajouter l'espace de travail pour les enseignants
    if (isTeacherRole(user.role) || user.role === UserRoles.admin) {
      steps.push({
        id: 'workspace',
        title: 'Espace de travail',
        text: 'Votre atelier de création pédagogique. Créez et organisez vos ressources : exercices interactifs, activités d\'apprentissage, et cercles thématiques. C\'est le cœur créatif de PLaTon pour les enseignants.',
        attachTo: {
          element: '#tuto-sidebar-espace-de-travail',
          on: 'right'
        }
      });
    }

    // Ajouter l'administration pour les admins
    if (user.role === UserRoles.admin) {
      steps.push({
        id: 'admin',
        title: 'Administration',
        text: 'En tant qu\'administrateur, vous avez accès au panneau d\'administration complet. Gérez les utilisateurs, configurez les paramètres globaux, supervisez l\'utilisation de la plateforme et maintenez son bon fonctionnement.',
        attachTo: {
          element: '#tuto-sidebar-administration',
          on: 'right'
        }
      });
    }

    // Ajouter les liens du bas
    steps.push(
      {
        id: 'account',
        title: 'Mon compte',
        text: 'Personnalisez votre profil enseignant, gérez vos préférences d\'interface et vos informations de contact. Les paramètres que vous définissez ici affectent votre expérience sur l\'ensemble de la plateforme.',
        attachTo: {
          element: '#tuto-sidebar-mon-compte',
          on: 'right'
        }
      }
    );

    // Documentation pour les enseignants
    if (isTeacherRole(user.role)) {
      steps.push({
        id: 'documentation',
        title: 'Documentation',
        text: 'Accédez à la documentation technique complète de PLaTon, incluant des guides pour la création d\'exercices avancés, l\'utilisation des langages spécifiques et les bonnes pratiques pédagogiques recommandées.',
        attachTo: {
          element: '#tuto-sidebar-documentation',
          on: 'right'
        }
      });
    }

    // Étape finale avec choix de navigation
    steps.push({
      id: 'navigation-choice',
      title: 'Où souhaitez-vous commencer votre parcours ?',
      text: this.buildNavigationChoiceHTML(user),
      buttons: [
        {
          text: 'Aller à la section choisie',
          action: () => this.handleNavigationChoice()
        },
        {
          text: 'Terminer le tutoriel',
          secondary: true,
          action: () => this.shepherdService.complete()
        }
      ],
      when: {
        show: () => this.setupNavigationSelection(user)
      }
    });

    return steps;
  }

  /**
   * Construit le HTML pour le choix de navigation
   */
  private buildNavigationChoiceHTML(user: User): string {
    const choices = this.getNavigationChoices(user);

    let html = '<div class="navigation-selection-container" style="margin: 20px 0;">';
    html += '<p style="margin-bottom: 16px; font-weight: 500;">Choisissez où vous souhaitez commencer :</p>';

    choices.forEach((choice) => {
      html += `
        <div class="navigation-option"
             data-navigation-url="${choice.url}"
             style="
               display: flex;
               align-items: center;
               padding: 12px;
               margin: 8px 0;
               border: 2px solid #e1e5e9;
               border-radius: 8px;
               cursor: pointer;
               transition: all 0.2s ease;
             ">
          <div style="
            width: 40px;
            height: 40px;
            background: #f0f2f5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
          ">
            <mat-icon style="font-size: 20px; color: #666;">${choice.icon}</mat-icon>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${choice.title}</div>
            <div style="font-size: 14px; color: #666;">${choice.description}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    html += `
      <style>
        .navigation-option:hover {
          border-color: #1890ff !important;
          background-color: #f6fdff !important;
        }
        .navigation-option.selected {
          border-color: #1890ff !important;
          background-color: #e6f7ff !important;
        }
      </style>
    `;

    return html;
  }

  /**
   * Retourne les choix de navigation disponibles
   */
  private getNavigationChoices(user: User): NavigationChoice[] {
    const choices: NavigationChoice[] = [
      // {
      //   title: 'Tableau de bord',
      //   url: '/dashboard',
      //   icon: '📊📈',
      //   description: 'Commencer par voir votre vue d\'ensemble'
      // },
      {
        title: 'Cours',
        url: '/courses',
        icon: '📚',
        description: 'Explorer les cours disponibles',
        queryParams: { tutorial: 'course-management' }
      },
      // {
      //   title: 'Corrections',
      //   url: '/corrections',
      //   icon: '📝',
      //   description: 'Voir vos exercices à corriger'
      // }
    ];

    if (isTeacherRole(user.role)) {
      choices.push({
        title: 'Espace de travail',
        url: '/resources',
        icon: '🛠️',
        description: 'Créer et gérer vos ressources',
        queryParams: { tutorial: 'workspace' }
      });
    }

    // if (user.role === UserRoles.admin) {
    //   choices.push({
    //     title: 'Administration',
    //     url: '/admin',
    //     icon: '🔧',
    //     description: 'Gérer la plateforme'
    //   });
    // }

    // choices.push({
    //   title: 'Mon compte',
    //   url: '/account/about-me',
    //   icon: '👤',
    //   description: 'Configurer votre profil'
    // });

    return choices;
  }

  /**
   * Configure la sélection de navigation
   */
  private setupNavigationSelection(user: User): void {
    setTimeout(() => {
      const options = document.querySelectorAll('.navigation-option');
      options.forEach(option => {
        option.addEventListener('click', (event) => {
          const target = event.currentTarget as HTMLElement;
          const navigationUrl = target.getAttribute('data-navigation-url');
          this.selectedNavigation = navigationUrl;

          // Mettre à jour la sélection visuelle
          options.forEach(opt => opt.classList.remove('selected'));
          target.classList.add('selected');
        });
      });

      // Sélectionner "Cours" par défaut
      const coursesOption = Array.from(options).find(
        opt => opt.getAttribute('data-navigation-url') === '/courses'
      );
      if (coursesOption) {
        coursesOption.classList.add('selected');
        this.selectedNavigation = '/courses';
      }
    }, 100);
  }

  /**
 * Gère la navigation vers la section choisie
 */
  private handleNavigationChoice(): void {
    if (!this.selectedNavigation) {
      alert('Veuillez sélectionner une section avant de continuer.');
      return;
    }

    // Terminer le tutoriel
    this.shepherdService.complete();

    const selectedChoice = this.getNavigationChoices(this.user as User).find(
      choice => choice.url === this.selectedNavigation
    );

    // Naviguer vers la section choisie
    setTimeout(() => {
      if (selectedChoice?.queryParams) {
        this.router.navigate([this.selectedNavigation!], { queryParams: selectedChoice.queryParams });
      } else {
        this.router.navigate([this.selectedNavigation!]);
      }
    }, 500);
  }
}