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
        text: `<div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--brand-text-primary); margin: 0 0 12px 0; font-weight: 600;">
                  Créez votre premier cours pour continuer
                </h3>
                <p style="color: var(--brand-text-secondary); margin: 0 0 16px 0; line-height: 1.5;">
                  Le tutoriel de gestion de cours nécessite au moins un cours existant.
                  Voulez-vous apprendre à en créer un ?
                </p>
                <div style="background: var(--brand-background-components);
                            border-radius: 8px; padding: 16px; margin: 16px 0;
                            border-left: 3px solid var(--brand-color-primary);">
                  <div style="text-align: left; color: var(--brand-text-primary); font-size: 14px; line-height: 1.8;">
                    Créer un cours<br>
                    Organiser le contenu avec des sections<br>
                    Ajouter des activités<br>
                    Gérer la structure du cours
                  </div>
                </div>
              </div>`,
        buttons: [
          {
            text: 'Annuler',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
          {
            text: 'Apprendre à créer un cours',
            action: () => this.redirectToResourceCreationTutorial(user),
          },
        ],
      },
    ]

    this.shepherdService.startTutorial(steps, {
      tourName: 'no-courses-tutorial',
      useModalOverlay: true,
    })
  }

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
        title: 'Gestion de cours PLaTon',
        text: `<div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--brand-text-primary); margin: 0 0 12px 0; font-weight: 600;">
                  Qu'allez-vous apprendre ?
                </h3>
                <p style="color: var(--brand-text-secondary); margin: 0 0 20px 0; line-height: 1.5;">
                  Ce tutoriel vous guide pour organiser et gérer efficacement un cours sur PLaTon.
                </p>
                <div style="background: var(--brand-background-components);
                            border-radius: 8px; padding: 16px; margin: 16px 0;
                            border-left: 3px solid var(--brand-color-primary);">
                  <div style="text-align: left; color: var(--brand-text-primary); font-size: 14px; line-height: 1.8;">
                    Naviguer dans l'interface d'un cours<br>
                    Créer et gérer des sections<br>
                    Ajouter et configurer des activités<br>
                    Suivre la progression des étudiants<br>
                    Archiver les cours terminés
                  </div>
                </div>
                <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 16px 0 0 0;">
                  Durée : ~5 minutes &nbsp;|&nbsp; Interruptible à tout moment
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
        id: 'courses-tabs',
        title: 'Cours actuels et archivés',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Vos cours sont organisés en deux onglets pour mieux distinguer ce que vous suivez
                 de ce que vous avez terminé.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;
                             border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <small style="color: var(--brand-text-secondary);">
                     <strong>Cours actuels</strong> — les cours que vous suivez activement
                   </small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);">
                     <strong>Cours archivés</strong> — les cours que vous avez marqués comme terminés
                   </small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-courses-tabs',
          on: 'bottom',
        },
        buttons: [
          {
            text: 'Précédent',
            secondary: true,
            action: () => this.shepherdService.previous(),
          },
          {
            text: 'Suivant',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'courses-archive-feature',
        title: 'Archiver un cours',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Sur chaque cours, un bouton vous permet de l'archiver ou de le désarchiver
                 en un clic.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);">
                     <strong>Archiver</strong> — déplace le cours dans l'onglet « Cours archivés »
                   </small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);">
                     <strong>Désarchiver</strong> — le cours revient dans « Cours actuels »
                   </small>
                 </div>
                 <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                             padding: 10px; margin-top: 6px;
                             border: 1px solid rgba(var(--brand-color-primary-rgb), 0.2);">
                   <small style="color: var(--brand-text-primary); font-size: 12px;">
                     L'archivage n'affecte que votre vue personnelle — le cours reste accessible aux autres membres.
                   </small>
                 </div>
               </div>`,
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
          {
            text: 'Suivant',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'select-course',
        title: 'Sélectionnez un cours',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Pour explorer la gestion d'un cours, cliquez sur l'un des cours disponibles dans la liste.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez maintenant sur un cours pour continuer le tutoriel.
                 </p>
               </div>`,
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
        title: `Bienvenue dans la gestion du cours`,
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Vous êtes maintenant dans l'interface de gestion du cours
                 <strong style="color: var(--brand-text-primary);">"${course.name}"</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   Depuis cette interface, vous gérez la structure, le contenu, les paramètres et les membres du cours.
                 </small>
               </div>`,
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
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 L'en-tête regroupe les informations principales du cours.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Nom du cours</strong> — modifiable en cliquant dessus</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Description</strong> — également modifiable</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-course-header-group',
          on: 'bottom',
        },
      },
      {
        id: 'tuto-course-tab-dashboard',
        title: 'Navigation par onglets',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Les onglets donnent accès aux différentes sections du cours.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Vue d'ensemble</strong> — organisation du contenu</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Membres</strong> — gestion des participants</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Groupes</strong> — organisation en équipes</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Paramètres</strong> — configuration avancée</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-course-tabs .ant-tabs-nav',
          on: 'bottom',
        },
      },
      {
        id: 'dashboard-overview',
        title: "Vue d'ensemble du cours",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 L'onglet <strong style="color: var(--brand-text-primary);">Vue d'ensemble</strong> est le cœur
                 de la gestion de contenu. Vous y créez des <strong style="color: var(--brand-text-primary);">sections</strong>
                 pour organiser vos <strong style="color: var(--brand-text-primary);">activités</strong>.
               </p>`,
        attachTo: {
          element: '#tuto-course-dashboard-content',
          on: 'right',
        },
      },
      {
        id: 'search-and-actions',
        title: "Barre d'actions",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cette barre regroupe les principales actions de gestion du cours.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Rechercher</strong> — dans les sections et activités</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Ajouter une section</strong> — organiser le contenu</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Ajouter une activité</strong> — créer du contenu directement</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Exporter</strong> — télécharger les données du cours</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-course-dashboard-header',
          on: 'bottom',
        },
      },
      {
        id: 'sections-explanation',
        title: 'Organiser avec des sections',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Les <strong style="color: var(--brand-text-primary);">sections</strong> structurent votre cours
                 comme des chapitres dans un manuel.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);">Organiser le contenu par thématiques ou séances</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);">Faciliter la navigation pour les étudiants</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);">Structurer la progression pédagogique</small>
                 </div>
               </div>`,
      },
      {
        id: 'add-first-section',
        title: 'Créer une section',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Si ce cours n'a pas encore de sections, créons-en une maintenant.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez sur <strong>Ajouter une section</strong> pour continuer.
                 </p>
               </div>`,
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
        title: 'Section créée',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Votre section est prête. Vous pouvez maintenant la personnaliser.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Renommer</strong> — cliquez sur le nom de la section</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Réorganiser</strong> — faites glisser les sections pour changer leur ordre</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Ajouter des activités</strong> — remplissez la section avec du contenu</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-course-no-activities',
          on: 'right',
        },
      },
      {
        id: 'section-management',
        title: 'Gérer une section',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Chaque section dispose d'actions de gestion accessibles depuis son en-tête.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Menu d'actions</strong> — déplacer, supprimer, et plus</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Ajouter une activité</strong> — créer du contenu dans cette section</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Modifier le nom</strong> — cliquez directement sur le titre</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-course-section-actions',
          on: 'left',
        },
      },
      {
        id: 'add-activity',
        title: 'Ajouter une activité',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Les <strong style="color: var(--brand-text-primary);">activités</strong> sont les exercices et
                 évaluations que vos étudiants réaliseront dans ce cours.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez sur <strong>Ajouter une activité</strong> pour créer votre premier exercice.
                 </p>
               </div>`,
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
            text: 'Précédent',
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

  private continueWithDetailsTutorial(course: Course): void {
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
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Votre cours contient déjà des activités. Vous pouvez les gérer,
                 modifier leurs paramètres ou en ajouter d'autres selon vos besoins.
               </p>`,
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
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Choisissez le mode d'affichage qui correspond à votre façon de travailler.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Mode cartes</strong> — affichage visuel par sections</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Mode tableau</strong> — vue d'ensemble condensée</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-course-view-mode',
          on: 'left',
        },
      },
      {
        id: 'statistics-sidebar',
        title: 'Statistiques du cours',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 La barre latérale affiche des indicateurs clés pour
                 <strong style="color: var(--brand-text-primary);">suivre l'engagement</strong> de vos étudiants.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Progression</strong> — avancement moyen des étudiants</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Temps passé</strong> — durée totale sur les activités</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Participants</strong> — nombre d'enseignants et d'étudiants</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-course-statistics',
          on: 'left',
        },
      },
      {
        id: 'check-activities-exist',
        title: 'Activités disponibles',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Voyons comment lire les informations d'une activité dans votre cours.
               </p>`,
        when: {
          show: () => {
            const activityCard = document.querySelector('.tuto-course-activities-grid course-activity-card')
            if (!activityCard) {
              for (let i = 0; i < 5; i++) {
                this.shepherdService.next()
              }
            }
          },
        },
      },
      {
        id: 'activity-card-overview',
        title: "La carte d'activité",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Chaque activité est représentée par une carte regroupant
                 toutes les informations essentielles pour la gérer et la suivre.
               </p>`,
        attachTo: {
          element: '#tuto-first-activity-card',
          on: 'left',
        },
      },
      {
        id: 'activity-status',
        title: "Statut de l'activité",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le badge indique l'état d'accès actuel de l'activité.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Ouvert</strong> — les étudiants peuvent accéder à l'activité</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Fermé</strong> — accès restreint</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Planifié</strong> — ouverture programmée à une date donnée</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-first-activity-card .ant-ribbon',
          on: 'right',
        },
      },
      {
        id: 'activity-progression',
        title: 'Suivi de la progression',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le cercle de progression indique l'avancement moyen des étudiants sur cette activité.
               </p>`,
        attachTo: {
          element: '#tuto-first-activity-card .circle-progression-container',
          on: 'right',
        },
      },
      {
        id: 'activity-actions',
        title: "Actions sur l'activité",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Les boutons d'action permettent d'interagir avec l'activité.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Lancer</strong> — tester l'activité comme un étudiant</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Éditer</strong> — modifier le contenu de l'activité</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;
                             border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <small style="color: var(--brand-text-secondary);"><strong>Menu</strong> — paramètres d'accès (dates d'ouverture/fermeture), statistiques, export</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-first-activity-card mat-card-actions',
          on: 'top',
        },
      },
      ...this.buildCommonFinalSteps(course),
    ]
  }

  private buildCommonFinalSteps(_course: Course): TutorialStep[] {
    return [
      {
        id: 'tutorial-complete',
        title: 'Tutoriel terminé',
        text: `<div style="text-align: center; padding: 20px;">
                 <h3 style="color: var(--brand-text-primary); margin: 0 0 16px 0;">
                   Vous maîtrisez la gestion de cours sur PLaTon !
                 </h3>
                 <div style="background: var(--brand-background-components); border-radius: 8px;
                             padding: 16px; margin: 16px 0;
                             border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <div style="text-align: left; color: var(--brand-text-secondary); line-height: 1.8;">
                     Naviguer dans l'interface de cours<br>
                     Créer et gérer des sections<br>
                     Ajouter des activités<br>
                     Utiliser la recherche et les filtres<br>
                     Suivre la progression des étudiants
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
  }
}
