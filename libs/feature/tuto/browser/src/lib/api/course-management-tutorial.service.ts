import { Injectable } from '@angular/core'
import { NavigationStart, Router } from '@angular/router'
import { Subscription } from 'rxjs'
import { filter, take } from 'rxjs/operators'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { ResourceCreationTutorialService } from './resource-creation-tutorial.service'
import { User } from '@platon/core/common'
import { Course } from '@platon/feature/course/common'

@Injectable({
  providedIn: 'root',
})
export class CourseManagementTutorialService {
  private isResearchActivity = true
  private navigationSub: Subscription | null = null

  private _isFromTutorial = false

  getIsFromTutorial(): boolean {
    return this._isFromTutorial
  }

  resetTutorialFlag(): void {
    this._isFromTutorial = false
  }

  constructor(
    private shepherdService: ShepherdService,
    private router: Router,
    private resourceCreationTutorialService: ResourceCreationTutorialService
  ) {}

  startCourseManagementTutorial(user: User, courses: Course[] = []): void {
    // Vérifier s'il y a des cours disponibles
    if (!courses.length) {
      this.startNoCoursesTutorial(user)
      return
    }

    const steps = this.buildCoursesListTutorialSteps(user)

    this.shepherdService.startTutorial(steps, {
      tourName: 'course-management-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de gestion de cours ?',
    })
  }

  private startNoCoursesTutorial(user: User): void {
    const steps: TutorialStep[] = [
      {
        id: 'no-courses-welcome',
        title: 'Aucun cours disponible',
        text: `Pour apprendre à gérer un cours, vous devez d'abord en créer un !<br><br>
               <strong>Que vais-je apprendre ?</strong><br>
               - Comment créer un cours<br>
               - Comment organiser le contenu avec des sections<br>
               - Comment ajouter des activités<br>
               - Comment gérer la structure d'un cours`,
        buttons: [
          {
            text: 'Apprendre à créer un cours',
            action: () => this.redirectToResourceCreationTutorial(user),
          },
          {
            text: 'Annuler',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
        ],
      },
    ]

    this.shepherdService.startTutorial(steps, {
      tourName: 'no-courses-tutorial',
      useModalOverlay: true,
    })
  }

  /**
   * Redirige vers le tutoriel de création de ressource
   */
  private redirectToResourceCreationTutorial(user: User): void {
    this.shepherdService.complete()
    setTimeout(() => {
      this.resourceCreationTutorialService.startResourceCreationTutorial(user)
    }, 500)
  }

  private buildCoursesListTutorialSteps(_user: User): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'courses-welcome',
        title: 'Bienvenue dans la gestion de cours !',
        text: `Ce tutoriel va vous apprendre à organiser et gérer efficacement un cours sur PLaTon.<br><br>
               <strong>Programme du tutoriel :</strong><br>
               - Navigation dans un cours<br>
               - Création et gestion des sections<br>
               - Ajout d'activités<br>
               - Organisation du contenu<br>
               - Conseils de bonnes pratiques`,
        buttons: [
          {
            text: 'Annuler',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
          {
            text: 'Commencer le tutoriel',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'select-course',
        title: 'Choisissez un cours',
        text: `Pour apprendre à gérer un cours, nous devons d'abord en sélectionner un.<br><br>
               <strong>Cliquez sur l'un des cours ci-dessous</strong> pour commencer le tutoriel de gestion.`,
        attachTo: {
          element: '#tuto-courses-course-list',
          on: 'top',
        },
        buttons: [
          {
            text: 'Précédent',
            secondary: true,
            action: () => this.shepherdService.previous(),
          },
        ],
        when: {
          show: () => {
            this._isFromTutorial = true

            this.navigationSub?.unsubscribe()
            this.navigationSub = this.router.events
              .pipe(
                filter((event) => event instanceof NavigationStart),
                take(1)
              )
              .subscribe(() => {
                this.shepherdService.complete()
              })
          },
          hide: () => {
            this.navigationSub?.unsubscribe()
            this.navigationSub = null
          },
        },
      },
    ]

    return steps
  }

  startCourseDetailsTutorial(course: Course): void {
    const steps = this.buildCourseDetailsTutorialSteps(course)

    this.shepherdService.startTutorial(steps, {
      tourName: 'course-details-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de gestion de cours ?',
    })
  }

  private buildCourseDetailsTutorialSteps(course: Course): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'course-overview',
        title: `Bienvenue !`,
        text: `Parfait ! Nous sommes maintenant dans la page de gestion du cours : "${course.name}".<br><br>
               Cette interface vous permet de gérer complètement votre cours : structure, contenu, paramètres et membres.`,
        buttons: [
          {
            text: "Découvrir l'interface",
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'course-header',
        title: 'En-tête du cours',
        text: `L'en-tête contient les informations principales :<br><br>
               • <strong>Nom du cours</strong> : modifiable en cliquant dessus<br>
               • <strong>Description</strong> : également modifiable<br>
               • <strong>Informations</strong> : date de création et créateur`,
        attachTo: {
          element: '#tuto-course-header',
          on: 'bottom',
        },
      },
      {
        id: 'tuto-course-tab-dashboard',
        title: 'Navigation par onglets',
        text: `Les onglets vous permettent d'accéder aux différentes sections :<br><br>
               • <strong>Vue d'ensemble</strong> : organisation du contenu<br>
               • <strong>Membres</strong> : gestion des participants<br>
               • <strong>Groupes</strong> : organisation en équipes<br>
               • <strong>Paramètres</strong> : configuration avancée`,
      },
      {
        id: 'dashboard-overview',
        title: "Vue d'ensemble du cours",
        text: `Nous sommes dans l'onglet "Vue d'ensemble" qui est le cœur de la gestion de contenu.<br><br>
               Ici vous pouvez créer des <strong>sections</strong> pour organiser vos <strong>activités</strong>.`,
        attachTo: {
          element: '#tuto-course-dashboard-content',
          on: 'right',
        },
      },
      {
        id: 'search-and-actions',
        title: 'Barre de recherche et actions',
        text: `Cette barre vous permet de :<br><br>
               • <strong>Rechercher</strong> dans les activités et sections<br>
               • <strong>Ajouter des sections</strong> pour organiser le contenu<br>
               • <strong>Ajouter des activités</strong> directement<br>
               • <strong>Exporter</strong> les données du cours`,
        attachTo: {
          element: '#tuto-course-dashboard-header',
          on: 'bottom',
        },
      },
      {
        id: 'sections-explanation',
        title: 'Organisation avec les sections',
        text: `Les <strong>sections</strong> sont comme des chapitres dans votre cours.<br><br>
               <strong>Pourquoi utiliser des sections ?</strong><br>
               • Organiser le contenu par thématiques<br>
               • Faciliter la navigation pour les étudiants<br>
               • Structurer la progression pédagogique`,
      },
      {
        id: 'add-first-section',
        title: 'Créons votre première section !',
        text: `Si ce cours n'a pas encore de sections, créons-en une maintenant.<br><br>
               Cliquez sur <strong>"Ajouter une section"</strong> pour commencer.`,
        attachTo: {
          element: '#tuto-course-add-section-button',
          on: 'bottom',
        },
        advanceOn: {
          selector: '#tuto-course-add-section-button',
          event: 'click',
        },
        buttons: [
          {
            text: 'Section déjà créée',
            secondary: true,
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'section-created',
        title: 'Section créée !',
        text: `Excellent ! Une nouvelle section a été créée.<br><br>
               Vous pouvez maintenant :<br>
               • <strong>Renommer</strong> la section en cliquant sur son nom<br>
               • <strong>Réorganiser</strong> l'ordre des sections<br>
               • <strong>Ajouter des activités</strong> dans cette section`,
        attachTo: {
          element: '#tuto-course-no-activities',
          on: 'right',
        },
      },
      {
        id: 'section-management',
        title: 'Gestion des sections',
        text: `Chaque section dispose d'actions de gestion :<br><br>
               • <strong>Menu "⋯"</strong> : actions avancées (déplacer, supprimer, etc.)<br>
               • <strong>"Ajouter une activité"</strong> : créer du contenu<br>
               • <strong>Modification du nom</strong> : clic direct sur le titre`,
        attachTo: {
          element: '#tuto-course-section-actions',
          on: 'left',
        },
      },
      {
        id: 'add-activity',
        title: 'Ajoutons une activité !',
        text: `Une section sans activité est comme un chapitre vide.<br><br>
        Cliquez sur <strong>"Ajouter une activité"</strong> pour créer votre premier exercice.`,
        attachTo: {
          element: '#tuto-course-add-activity-button',
          on: 'bottom',
        },
        advanceOn: {
          selector: '#tuto-course-add-activity-button',
          event: 'click',
        },
        buttons: [
          {
            text: 'Precedent',
            secondary: true,
            action: () => this.shepherdService.previous(),
          },
          {
            text: 'Activité déjà ajoutée',
            action: () => {
              this.isResearchActivity = false
              this.shepherdService.complete()
              setTimeout(() => {
                this.continueWithDetailsTutorial(course)
              }, 100)
            },
          },
        ],
      },
    ]

    return steps
  }

  /**
   * Continue le tutoriel après le choix de l'utilisateur
   */
  private continueWithDetailsTutorial(course: Course): void {
    // Déterminer les prochaines étapes en fonction du choix de l'utilisateur
    const nextSteps = this.buildExistingActivitySteps(course)

    this.shepherdService.startTutorial(nextSteps, {
      tourName: 'course-details-tutorial-continued',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de gestion de cours ?',
    })
  }

  private buildExistingActivitySteps(course: Course): TutorialStep[] {
    return [
      {
        id: 'existing-activity',
        title: 'Activité existante',
        text: `Parfait ! Vous avez déjà ajouté une activité à ce cours.<br><br>
              Vous pouvez gérer cette activité, modifier ses paramètres ou en ajouter d'autres selon vos besoins.`,
        buttons: [
          {
            text: 'Continuer',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'view-modes',
        title: "Modes d'affichage",
        text: `Vous pouvez changer la façon dont le contenu est affiché :<br><br>
               • <strong>Mode cartes</strong> : affichage visuel par sections<br>
               • <strong>Mode tableau</strong> : vue d'ensemble condensée<br><br>
               Choisissez le mode qui convient le mieux à votre façon de travailler.`,
        attachTo: {
          element: '#tuto-course-view-mode',
          on: 'left',
        },
      },

      {
        id: 'statistics-sidebar',
        title: 'Statistiques du cours',
        text: `La barre latérale affiche des statistiques utiles :<br><br>
               • <strong>Progression</strong> : avancement moyen des étudiants<br>
               • <strong>Temps passé</strong> : durée totale sur les activités<br>
               • <strong>Nombre d'enseignants et d'étudiants</strong><br><br>
               Ces données vous aident à suivre l'engagement de vos étudiants.`,
        attachTo: {
          element: '#tuto-course-statistics',
          on: 'left',
        },
      },
      {
        id: 'check-activities-exist',
        title: 'Activités disponibles',
        text: `Parfait ! Vous avez des activités dans votre cours.<br><br>
         Découvrons maintenant comment interpréter les informations d'une activité.`,
        when: {
          show: () => {
            const activityCard = document.querySelector('.tuto-course-activities-grid course-activity-card')
            if (!activityCard) {
              // Alors c'est simple, on saute toutes etapes suivantes et afficher la fin
              for (let i = 0; i < 5; i++) {
                this.shepherdService.next()
              }
            }
          },
        },
      },
      {
        id: 'activity-card-overview',
        title: "Découverte d'une activité",
        text: `Voici une carte d'activité qui contient toutes les informations essentielles pour gérer l'activité.`,
        attachTo: {
          element: '#tuto-first-activity-card',
          on: 'left',
        },
      },
      {
        id: 'activity-status',
        title: "Statut de l'activité",
        text: `Le badge indique l'état actuel :<br><br>
         • <strong>Ouvert</strong> : L'utilisateur peut acceder à l'activité<br>
         • <strong>Fermé</strong> : accès restreint<br>
         • <strong>Planifié</strong> : ouverture programmée`,
        attachTo: {
          element: '#tuto-first-activity-card .ribbon-container',
          on: 'right',
        },
      },
      {
        id: 'activity-progression',
        title: 'Suivi de la progression',
        text: `Le cercle de progression montre votre avancement sur cette activité.<br><br>`,
        attachTo: {
          element: '#tuto-first-activity-card .circle-progression-container',
          on: 'right',
        },
      },
      {
        id: 'activity-actions',
        title: "Actions sur l'activité",
        text: `Les boutons d'action vous permettent de :<br><br>
         <strong>Lancer</strong> : tester l'activité comme un étudiant<br>
         <strong>Éditer</strong> : modifier le contenu<br>
         <strong>⋮ Menu</strong> : paramètres (<b>important pour gérer les périodes d'accès aux utilisateurs</b>), statistiques, export`,
        attachTo: {
          element: '#tuto-first-activity-card mat-card-actions',
          on: 'top',
        },
      },
      ...this.buildCommonFinalSteps(course),
    ]
  }

  /**
   * Étapes communes qui concluent le tutoriel
   */
  private buildCommonFinalSteps(_course: Course): TutorialStep[] {
    return [
      {
        id: 'tutorial-complete',
        title: 'Félicitations ! 🎉',
        text: `Excellent travail ! Vous maîtrisez maintenant la gestion de cours sur PLaTon.<br><br>
              <strong>Ce que vous avez appris :</strong><br>
              - Navigation dans l'interface de cours<br>
              - Création et gestion des sections<br>
              - Ajout d'activités<br>
              - Fonctionnalités de recherche<br>
              - Bonnes pratiques d'organisation<br><br>
              Vous êtes maintenant prêt à créer des cours bien structurés !`,
        buttons: [
          {
            text: 'Terminer le tutoriel',
            action: () => this.shepherdService.complete(),
          },
        ],
      },
    ]
  }
}
