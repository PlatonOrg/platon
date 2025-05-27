import { Injectable } from '@angular/core';
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { User, UserRoles, isTeacherRole } from '@platon/core/common';

export interface NavigationChoice {
  title: string;
  url: string;
  icon: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarTutorialService {
  private selectedNavigation: string | null = null;

  constructor(
    private shepherdService: ShepherdService
  ) {}

  /**
   * Démarre le tutoriel complet de la sidebar
   */
  startSidebarTutorial(
    user: User,
    topLinks: any[],
    bottomLinks: any[],
    navigateCallback: (route: string) => void
  ): void {
    const steps = this.buildTutorialSteps(user, topLinks, bottomLinks, navigateCallback);

    this.shepherdService.startTutorial(steps, {
      tourName: 'sidebar-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de navigation ?'
    });
  }

  /**
   * Construit les étapes du tutoriel en fonction de l'utilisateur
   */
  private buildTutorialSteps(
    user: User,
    topLinks: any[],
    bottomLinks: any[],
    navigateCallback: (route: string) => void
  ): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue dans la navigation PLaTon !',
        text: 'Ce tutoriel va vous présenter les différentes sections de l\'application. Découvrons ensemble comment naviguer dans PLaTon.',
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
        text: 'Le logo PLaTon vous permet de revenir rapidement au tableau de bord depuis n\'importe quelle page.',
        attachTo: {
          element: '#tuto-sidebar-logo',
          on: 'right'
        }
      },
      {
        id: 'dashboard',
        title: 'Tableau de bord',
        text: 'Le tableau de bord est votre page d\'accueil. Vous y retrouvez un résumé de votre activité et vos cours récents.',
        attachTo: {
          element: '#tuto-sidebar-tableau-de-bord',
          on: 'right'
        }
      },
      {
        id: 'courses',
        title: 'Section Cours',
        text: 'Accédez à tous vos cours, qu\'ils soient en cours, terminés ou à venir. C\'est le cœur de votre apprentissage sur PLaTon.',
        attachTo: {
          element: '#tuto-sidebar-cours',
          on: 'right'
        }
      },
      {
        id: 'corrections',
        title: 'Corrections',
        text: 'Consultez les corrections de vos exercices et suivez votre progression. Les enseignants peuvent y corriger les travaux des étudiants.',
        attachTo: {
          element: '#tuto-sidebar-corrections',
          on: 'right'
        }
      }
    ];

    // Ajouter l'espace de travail pour les enseignants
    if (isTeacherRole(user.role)) {
      steps.push({
        id: 'workspace',
        title: 'Espace de travail',
        text: 'Votre espace personnel pour créer et organiser vos ressources pédagogiques : exercices, activités, et cercles de travail.',
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
        text: 'Accédez au panneau d\'administration pour gérer les utilisateurs, les cours et les paramètres de la plateforme.',
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
        text: 'Gérez votre profil, vos préférences et vos informations personnelles.',
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
        text: 'Accédez à la documentation complète de PLaTon pour découvrir toutes les fonctionnalités avancées.',
        attachTo: {
          element: '#tuto-sidebar-documentation',
          on: 'right'
        }
      });
    }

    // Étape finale avec choix de navigation
    steps.push({
      id: 'navigation-choice',
      title: 'Où voulez-vous commencer ?',
      text: this.buildNavigationChoiceHTML(user),
      buttons: [
        {
          text: 'Aller à la section choisie',
          action: () => this.handleNavigationChoice(navigateCallback)
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
      {
        title: 'Tableau de bord',
        url: '/dashboard',
        icon: '📊📈',
        description: 'Commencer par voir votre vue d\'ensemble'
      },
      {
        title: 'Cours',
        url: '/courses',
        icon: '📚',
        description: 'Explorer les cours disponibles'
      },
      {
        title: 'Corrections',
        url: '/corrections',
        icon: '📝',
        description: 'Voir vos exercices à corriger'
      }
    ];

    if (isTeacherRole(user.role)) {
      choices.push({
        title: 'Espace de travail',
        url: '/resources',
        icon: '🛠️',
        description: 'Créer et gérer vos ressources'
      });
    }

    if (user.role === UserRoles.admin) {
      choices.push({
        title: 'Administration',
        url: '/admin',
        icon: '🔧',
        description: 'Gérer la plateforme'
      });
    }

    choices.push({
      title: 'Mon compte',
      url: '/account/about-me',
      icon: '👤',
      description: 'Configurer votre profil'
    });

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
  private handleNavigationChoice(navigateCallback: (route: string) => void): void {
    if (!this.selectedNavigation) {
      alert('Veuillez sélectionner une section avant de continuer.');
      return;
    }

    // Terminer le tutoriel
    this.shepherdService.complete();

    // Naviguer vers la section choisie
    setTimeout(() => {
      navigateCallback(this.selectedNavigation!);
    }, 500);
  }

  /**
   * Démarre un mini-tutoriel pour une section spécifique
   */
  startSectionTutorial(section: 'courses' | 'corrections' | 'resources' | 'admin'): void {
    let steps: TutorialStep[] = [];

    switch (section) {
      case 'courses':
        steps = [{
          id: 'courses-tutorial',
          title: 'Section Cours',
          text: 'Ici vous pouvez parcourir tous les cours disponibles, vous inscrire à de nouveaux cours et suivre votre progression.',
        }];
        break;

      case 'corrections':
        steps = [{
          id: 'corrections-tutorial',
          title: 'Section Corrections',
          text: 'Consultez les corrections de vos exercices et les commentaires de vos enseignants.',
        }];
        break;

      case 'resources':
        steps = [{
          id: 'resources-tutorial',
          title: 'Espace de travail',
          text: 'Créez et organisez vos ressources pédagogiques : exercices, activités et cercles de travail.',
        }];
        break;

      case 'admin':
        steps = [{
          id: 'admin-tutorial',
          title: 'Administration',
          text: 'Gérez les utilisateurs, les cours et les paramètres globaux de la plateforme.',
        }];
        break;
    }

    this.shepherdService.startTutorial(steps, {
      tourName: `${section}-section-tutorial`,
      useModalOverlay: false
    });
  }
}