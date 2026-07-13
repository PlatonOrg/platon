import { Injectable } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { User, UserRoles, isTeacherRole } from '@platon/core/common'
import { Router } from '@angular/router'
import { NzMessageService } from 'ng-zorro-antd/message'

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

  constructor(private shepherdService: ShepherdService, private router: Router, private message: NzMessageService) {}

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
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cliquez sur le logo pour revenir au
                 <strong style="color: var(--brand-text-primary);">tableau de bord</strong>
                 depuis n'importe quelle page de la plateforme.
               </p>`,
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
            text: 'Suivant',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'dashboard',
        title: 'Tableau de bord',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Votre centre de contrôle : résumé de l'activité de vos cours,
                 <strong style="color: var(--brand-text-primary);">statistiques d'utilisation</strong>
                 et modèles d'exercices disponibles.
               </p>`,
        attachTo: {
          element: '#tuto-sidebar-tableau-de-bord',
          on: 'right',
        },
      },
      {
        id: 'annonces',
        title: 'Annonces',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Retrouvez ici les <strong style="color: var(--brand-text-primary);">messages importants</strong>
                 de la plateforme : mises à jour, informations de soutien et communications à l'attention des enseignants.
               </p>`,
        attachTo: {
          element: '#tuto-sidebar-annonces',
          on: 'right',
        },
      },
      {
        id: 'courses',
        title: 'Cours',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Gérez vos cours, créez de nouvelles sessions et
                 <strong style="color: var(--brand-text-primary);">suivez la progression</strong>
                 de vos étudiants.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   C'est ici que vous organisez votre enseignement et structurez votre contenu pédagogique.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-sidebar-cours',
          on: 'right',
        },
      },
      {
        id: 'corrections',
        title: 'Corrections',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Accédez aux travaux de vos étudiants nécessitant une
                 <strong style="color: var(--brand-text-primary);">évaluation manuelle</strong>.
                 Rédigez des retours détaillés et attribuez des notes.
               </p>`,
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
          text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                   Votre espace de <strong style="color: var(--brand-text-primary);">création pédagogique</strong> :
                   exercices interactifs, activités, cercles thématiques. C'est le cœur créatif de PLaTon pour les enseignants.
                 </p>`,
          attachTo: {
            element: '#tuto-sidebar-espace-de-travail',
            on: 'right',
          },
        },
        {
          id: 'tests',
          title: "Tests d'entrée",
          text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                   Configurez des <strong style="color: var(--brand-text-primary);">évaluations diagnostiques</strong>
                   pour mesurer les compétences de vos étudiants avant le début des cours.
                 </p>
                 <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                   <small style="color: var(--brand-text-secondary);">
                     Utilisez les résultats pour adapter votre enseignement aux besoins de votre groupe.
                   </small>
                 </div>`,
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
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 En tant qu'administrateur, accédez au panneau d'administration complet :
                 <strong style="color: var(--brand-text-primary);">gestion des utilisateurs</strong>,
                 configuration globale et supervision de la plateforme.
               </p>`,
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
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Consultez la <strong style="color: var(--brand-text-primary);">documentation technique</strong> :
                 guides de création d'exercices avancés, langages PLaTon et bonnes pratiques pédagogiques.
               </p>`,
        attachTo: {
          element: '#tuto-sidebar-documentation',
          on: 'right',
        },
      })
    }

    steps.push({
      id: 'navigation-choice',
      title: 'Par où souhaitez-vous commencer ?',
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
      '<p style="margin-bottom: 16px; color: var(--brand-text-secondary); line-height: 1.5;">' +
      "Vous avez découvert les sections de l'interface. " +
      'Choisissez où vous souhaitez commencer votre exploration :' +
      '</p>'

    choices.forEach((choice) => {
      html += `
        <div class="navigation-option"
             data-navigation-url="${choice.url}"
             style="
               padding: 12px 16px;
               margin: 8px 0;
               border: 2px solid var(--brand-border-color);
               border-radius: 8px;
               cursor: pointer;
               transition: all 0.2s ease;
               background: var(--brand-background-card);
             ">
          <div style="font-weight: 600; margin-bottom: 4px; color: var(--brand-text-primary);">${choice.title}</div>
          <div style="font-size: 13px; color: var(--brand-text-secondary);">${choice.description}</div>
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
        icon: 'book',
        description: 'Explorer et gérer vos cours',
        queryParams: { tutorial: 'course-management' },
      },
    ]

    if (isTeacherRole(user.role)) {
      choices.push({
        title: 'Espace de travail',
        url: '/resources',
        icon: 'folder',
        description: 'Créer et organiser vos ressources pédagogiques',
        queryParams: { tutorial: 'workspace' },
      })
    }

    return choices
  }

  private setupNavigationSelection(_user: User): void {
    setTimeout(() => {
      const options = document.querySelectorAll('.navigation-option')
      options.forEach((option) => {
        option.addEventListener('click', (event) => {
          const target = event.currentTarget as HTMLElement
          const navigationUrl = target.getAttribute('data-navigation-url')
          this.selectedNavigation = navigationUrl

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
      this.message.warning('Veuillez sélectionner une section avant de continuer.')
      return
    }

    this.shepherdService.complete()

    const selectedChoice = this.getNavigationChoices(this.user as User).find(
      (choice) => choice.url === this.selectedNavigation
    )

    setTimeout(() => {
      if (selectedChoice?.queryParams) {
        void this.router.navigate([this.selectedNavigation!], { queryParams: selectedChoice.queryParams })
      } else {
        void this.router.navigate([this.selectedNavigation!])
      }
    }, 500)
  }
}
