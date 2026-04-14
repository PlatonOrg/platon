import { Injectable } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { User, UserRoles, isTeacherRole } from '@platon/core/common'
import { Router } from '@angular/router'

export interface NavigationChoice {
  title: string
  url: string
  icon: string
  description: string
  queryParams?: { [key: string]: string }
}

@Injectable({
  providedIn: 'root',
})
export class SidebarTutorialService {
  private selectedNavigation: string | null = null
  private user: User | null = null

  constructor(private shepherdService: ShepherdService, private router: Router) {}

  startSidebarTutorial(user: User): void {
    this.user = user
    const steps = this.buildTutorialSteps(user)

    this.shepherdService.startTutorial(steps, {
      tourName: 'sidebar-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de navigation ?',
    })
  }

  private buildTutorialSteps(user: User): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'logo',
        title: 'Logo PLaTon',
        text: "Le logo PLaTon vous permet de revenir rapidement au tableau de bord depuis n'importe quelle page, vous donnant un accès rapide à toutes les fonctionnalités essentielles.",
        attachTo: {
          element: '#tuto-sidebar-logo',
          on: 'right',
        },
        buttons: [
          {
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
          {
            text: 'Suivant (Entrée)',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'dashboard',
        title: 'Tableau de bord',
        text: "Le tableau de bord est votre centre de contrôle. Vous y retrouvez un résumé de l'activité de vos cours, les statistiques d'utilisation et les dernières notifications importantes.",
        attachTo: {
          element: '#tuto-sidebar-tableau-de-bord',
          on: 'right',
        },
      },
      {
        id: 'annonces',
        title: 'Annonces',
        text: 'Dans cette section vous trouverez des messages personnalisés pour les enseignants et les étudiants. Vous trouverez ici des informations importantes, des mises à jour ou des informations de soutien.',
        attachTo: {
          element: '#tuto-sidebar-annonces',
          on: 'right',
        },
      },
      {
        id: 'courses',
        title: 'Section Cours',
        text: "Gérez tous vos cours, créez de nouvelles sessions et suivez la progression de vos étudiants. C'est ici que vous organisez votre enseignement et structurez votre contenu pédagogique.",
        attachTo: {
          element: '#tuto-sidebar-cours',
          on: 'right',
        },
      },
      {
        id: 'corrections',
        title: 'Corrections',
        text: 'Accédez aux travaux de vos étudiants qui nécessitent une évaluation manuelle. Vous pouvez y fournir des retours détaillés et attribuer des notes pour les exercices non auto-évalués.',
        attachTo: {
          element: '#tuto-sidebar-corrections',
          on: 'right',
        },
      },
    ]

    if (isTeacherRole(user.role) || user.role === UserRoles.admin) {
      steps.push(
        {
          id: 'workspace',
          title: 'Espace de travail',
          text: "Votre atelier de création pédagogique. Créez et organisez vos ressources : exercices interactifs, activités d'apprentissage, et cercles thématiques. C'est le cœur créatif de PLaTon pour les enseignants.",
          attachTo: {
            element: '#tuto-sidebar-espace-de-travail',
            on: 'right',
          },
        },
        {
          id: 'tests',
          title: "Tests d'entrée",
          text: "Configurez et gérez les tests d'entrée pour évaluer les compétences de vos étudiants avant le début des cours. Personnalisez les questions, les critères d'évaluation et suivez les résultats pour adapter votre enseignement.",
          attachTo: {
            element: '#tuto-sidebar-tests-d-entree',
            on: 'right',
          },
        }
      )
    }

    if (user.role === UserRoles.admin) {
      steps.push({
        id: 'admin',
        title: 'Administration',
        text: "En tant qu'administrateur, vous avez accès au panneau d'administration complet. Gérez les utilisateurs, configurez les paramètres globaux, supervisez l'utilisation de la plateforme et maintenez son bon fonctionnement.",
        attachTo: {
          element: '#tuto-sidebar-administration',
          on: 'right',
        },
      })
    }

    if (isTeacherRole(user.role)) {
      steps.push({
        id: 'documentation',
        title: 'Documentation',
        text: "Accédez à la documentation technique complète de PLaTon, incluant des guides pour la création d'exercices avancés, l'utilisation des langages spécifiques et les bonnes pratiques pédagogiques recommandées.",
        attachTo: {
          element: '#tuto-sidebar-documentation',
          on: 'right',
        },
      })
    }

    steps.push({
      id: 'navigation-choice',
      title: 'Où souhaitez-vous commencer votre parcours ?',
      text: this.buildNavigationChoiceHTML(user),
      buttons: [
        {
          text: 'Terminer le tutoriel',
          secondary: true,
          action: () => this.shepherdService.complete(),
        },
        {
          text: 'Aller à la section choisie',
          action: () => this.handleNavigationChoice(),
        },
      ],
      when: {
        show: () => this.setupNavigationSelection(user),
      },
    })

    return steps
  }

  private buildNavigationChoiceHTML(user: User): string {
    const choices = this.getNavigationChoices(user)

    let html = '<div class="navigation-selection-container" style="margin: 5px 0;">'
    html +=
      '<p style="margin-bottom: 16px; font-weight: 500; color: var(--brand-text-primary);">' +
      "Maintenant que vous avez exploré les différentes sections de l'interface." +
      '<br>' +
      'Decouvrons ensemble comment naviguer efficacement dans PLaTon pour gérer vos cours et ressources. ' +
      '<br>' +
      'Choisissez où vous souhaitez commencer :</p>'

    choices.forEach((choice) => {
      html += `
        <div class="navigation-option"
             data-navigation-url="${choice.url}"
             style="
               display: flex;
               align-items: center;
               padding: 12px;
               margin: 8px 0;
               border: 2px solid var(--brand-border-color);
               border-radius: 8px;
               cursor: pointer;
               transition: all 0.2s ease;
               background: var(--brand-background-card);
             ">
          <div style="
            width: 40px;
            height: 40px;
            background: var(--brand-background-components);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
          ">
            <mat-icon style="font-size: 20px; color: var(--brand-text-secondary);">${choice.icon}</mat-icon>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px; color: var(--brand-text-primary);">${choice.title}</div>
            <div style="font-size: 14px; color: var(--brand-text-secondary);">${choice.description}</div>
          </div>
        </div>
      `
    })

    html += '</div>'
    html += `
      <style>
        .navigation-option:hover {
          border-color: rgba(var(--brand-color-primary-rgb), 0.6) !important;
          background-color: rgba(var(--brand-color-primary-rgb), 0.05) !important;
        }
        .navigation-option.selected {
          border-color: rgba(var(--brand-color-primary-rgb), 0.8) !important;
          background-color: rgba(var(--brand-color-primary-rgb), 0.1) !important;
        }
      </style>
    `

    return html
  }

  private getNavigationChoices(user: User): NavigationChoice[] {
    const choices: NavigationChoice[] = [
      {
        title: 'Cours',
        url: '/courses',
        icon: '📚',
        description: 'Explorer les cours disponibles',
        queryParams: { tutorial: 'course-management' },
      },
    ]

    if (isTeacherRole(user.role)) {
      choices.push({
        title: 'Espace de travail',
        url: '/resources',
        icon: '🛠️',
        description: 'Créer et gérer vos ressources',
        queryParams: { tutorial: 'workspace' },
      })
    }

    return choices
  }

  /**
   * Configure la sélection de navigation
   */
  private setupNavigationSelection(_user: User): void {
    setTimeout(() => {
      const options = document.querySelectorAll('.navigation-option')
      options.forEach((option) => {
        option.addEventListener('click', (event) => {
          const target = event.currentTarget as HTMLElement
          const navigationUrl = target.getAttribute('data-navigation-url')
          this.selectedNavigation = navigationUrl

          // Mettre à jour la sélection visuelle
          options.forEach((opt) => opt.classList.remove('selected'))
          target.classList.add('selected')
        })
      })

      const coursesOption = Array.from(options).find((opt) => opt.getAttribute('data-navigation-url') === '/courses')
      if (coursesOption) {
        coursesOption.classList.add('selected')
        this.selectedNavigation = '/courses'
      }
    }, 100)
  }

  private handleNavigationChoice(): void {
    if (!this.selectedNavigation) {
      alert('Veuillez sélectionner une section avant de continuer.')
      return
    }

    // Terminer le tutoriel
    this.shepherdService.complete()

    const selectedChoice = this.getNavigationChoices(this.user as User).find(
      (choice) => choice.url === this.selectedNavigation
    )

    // Naviguer vers la section choisie
    setTimeout(() => {
      if (selectedChoice?.queryParams) {
        void this.router.navigate([this.selectedNavigation!], { queryParams: selectedChoice.queryParams })
      } else {
        void this.router.navigate([this.selectedNavigation!])
      }
    }, 500)
  }
}
