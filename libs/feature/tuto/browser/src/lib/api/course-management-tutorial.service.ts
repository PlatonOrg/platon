import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { ResourceCreationTutorialService } from './resource-creation-tutorial.service';
import { User, UserRoles } from '@platon/core/common';
import { Course } from '@platon/feature/course/common';

@Injectable({
  providedIn: 'root'
})
export class CourseManagementTutorialService {
  private selectedCourse: Course | null = null;
  private availableCourses: Course[] = [];
  private isResearchActivity : boolean = true

  constructor(
    private shepherdService: ShepherdService,
    private router: Router,
    private resourceCreationTutorialService: ResourceCreationTutorialService
  ) {}

  /**
   * Démarre le tutoriel de gestion de cours
   */
  startCourseManagementTutorial(user: User, courses: Course[] = []): void {
    this.selectedCourse = null;
    this.availableCourses = courses;


    // Vérifier s'il y a des cours disponibles
    if (!courses.length) {
      this.startNoCoursesTutorial(user);
      return;
    }

    const steps = this.buildCoursesListTutorialSteps(user);

    this.shepherdService.startTutorial(steps, {
      tourName: 'course-management-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de gestion de cours ?'
    });
  }

  /**
   * Tutoriel quand aucun cours n'est disponible
   */
  private startNoCoursesTutorial(user: User): void {
    const steps: TutorialStep[] = [
      {
        id: 'no-courses-welcome',
        title: 'Aucun cours disponible',
        text: `Pour apprendre à gérer un cours, vous devez d'abord en créer un !<br><br>
               <strong>Que vais-je apprendre ?</strong><br>
               • Comment créer un cours<br>
               • Comment organiser le contenu avec des sections<br>
               • Comment ajouter des activités<br>
               • Comment gérer la structure d'un cours`,
        buttons: [
          {
            text: 'Apprendre à créer un cours',
            action: () => this.redirectToResourceCreationTutorial(user)
          },
          {
            text: 'Annuler',
            secondary: true,
            action: () => this.shepherdService.cancel()
          }
        ]
      }
    ];

    this.shepherdService.startTutorial(steps, {
      tourName: 'no-courses-tutorial',
      useModalOverlay: true
    });
  }

  /**
   * Redirige vers le tutoriel de création de ressource
   */
  private redirectToResourceCreationTutorial(user: User): void {
    this.shepherdService.complete();
    setTimeout(() => {
      this.resourceCreationTutorialService.startResourceCreationTutorial(user);
    }, 500);
  }

  /**
   * Construit les étapes du tutoriel pour la liste des cours
   */
  private buildCoursesListTutorialSteps(user: User): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'courses-welcome',
        title: 'Bienvenue dans la gestion de cours !',
        text: `Ce tutoriel va vous apprendre à organiser et gérer efficacement un cours sur PLaTon.<br><br>
               <strong>Programme du tutoriel :</strong><br>
               • Navigation dans un cours<br>
               • Création et gestion des sections<br>
               • Ajout d'activités<br>
               • Organisation du contenu<br>
               • Conseils de bonnes pratiques`,
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
        id: 'select-course',
        title: 'Choisissez un cours',
        text: `Pour apprendre à gérer un cours, nous devons d'abord en sélectionner un.<br><br>
               <strong>Cliquez sur l'un des cours ci-dessous</strong> pour commencer le tutoriel de gestion.`,
        attachTo: {
          element: '#tuto-courses-course-list',
          on: 'top'
        },
        buttons: [
          {
            text: 'J\'ai cliqué sur un cours',
            action: () => this.checkCourseSelection()
          }
        ],
        when: {
          show: () => this.setupCourseSelectionListeners()
        }
      }
    ];

    return steps;
  }


  /**
   * Configure les listeners pour la sélection de cours
   */
  private setupCourseSelectionListeners(): void {
    setTimeout(() => {
      const courseItems = document.querySelectorAll('.tuto-course-item-container, ui-list-item-article');

      courseItems.forEach((item, index) => {
        const courseContainer = item.closest('[data-course-id]') || item;

        item.addEventListener('click', (event) => {

          // Récupérer l'ID du cours depuis l'attribut data
          const courseId = courseContainer.getAttribute('data-course-id');

          if (courseId) {
            this.selectedCourse = this.availableCourses.find(c => c.id === courseId) || null;
          } else {
            this.selectedCourse = this.availableCourses[index] || null;
          }

          if (this.selectedCourse) {
            this.shepherdService.complete();

            // Démarrer le tutoriel de gestion après redirection
            setTimeout(() => {
              this.startCourseDetailsTutorial(this.selectedCourse!);
            }, 0);
          } else {
            throw new Error(`Course not found for index ${index}`);
          }
        });
      });
      if (courseItems.length === 0) {

        const broadItems = document.querySelectorAll('nz-ribbon, course-item, [data-course-id]');

        broadItems.forEach((item, index) => {
          item.addEventListener('click', (event) => {

            const courseId = item.getAttribute('data-course-id');
            if (courseId) {
              this.selectedCourse = this.availableCourses.find(c => c.id === courseId) || null;
            } else {
              this.selectedCourse = this.availableCourses[index] || null;
            }

            if (this.selectedCourse) {
              this.shepherdService.complete();
              setTimeout(() => {
                this.startCourseDetailsTutorial(this.selectedCourse!);
              }, 200);
            }
          });
        });
      }
    }, 800);
  }

  /**
   * Vérifie si un cours a été sélectionné
   */
  private checkCourseSelection(): void {
    if (this.selectedCourse) {
      this.shepherdService.complete();
      setTimeout(() => {
        this.startCourseDetailsTutorial(this.selectedCourse!);
      }, 100);
    } else {
      alert('Veuillez d\'abord cliquer sur un cours dans la liste.');
    }
  }

  /**
   * Démarre le tutoriel détaillé de gestion de cours
   */
  startCourseDetailsTutorial(course: Course): void {
    const steps = this.buildCourseDetailsTutorialSteps(course);

    this.shepherdService.startTutorial(steps, {
      tourName: 'course-details-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de gestion de cours ?'
    });
  }


  /**
   * Construit les étapes du tutoriel détaillé
   */
  private buildCourseDetailsTutorialSteps(course: Course): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'course-overview',
        title: `Bienvenue dans le cours "${course.name}" !`,
        text: `Parfait ! Nous sommes maintenant dans la page de gestion du cours.<br><br>
               Cette interface vous permet de gérer complètement votre cours : structure, contenu, paramètres et membres.`,
        buttons: [
          {
            text: 'Découvrir l\'interface',
            action: () => this.shepherdService.next()
          }
        ]
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
          on: 'bottom'
        }
      },
      {
        id: 'course-tabs',
        title: 'Navigation par onglets',
        text: `Les onglets vous permettent d'accéder aux différentes sections :<br><br>
               • <strong>Vue d'ensemble</strong> : organisation du contenu<br>
               • <strong>Membres</strong> : gestion des participants<br>
               • <strong>Groupes</strong> : organisation en équipes<br>
               • <strong>Paramètres</strong> : configuration avancée`,
      },
      {
        id: 'dashboard-overview',
        title: 'Vue d\'ensemble du cours',
        text: `Nous sommes dans l'onglet "Vue d'ensemble" qui est le cœur de la gestion de contenu.<br><br>
               Ici vous pouvez créer des <strong>sections</strong> pour organiser vos <strong>activités</strong>.`,
        attachTo: {
          element: '#tuto-course-dashboard-content',
          on: 'right'
        }
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
          on: 'bottom'
        }
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
          on: 'bottom'
        },
        advanceOn: {
          selector: '#tuto-course-add-section-button',
          event: 'click'
        },
        buttons: [
          {
            text: 'Section déjà créée',
            secondary: true,
            action: () => this.shepherdService.next()
          }
        ]
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
          element: '#tuto-course-sections-container',
          on: 'right'
        }
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
          on: 'left'
        }
      },
      {
        id: 'add-activity',
        title: 'Ajoutons une activité !',
        text: `Une section sans activité est comme un chapitre vide.<br><br>
              Cliquez sur <strong>"Ajouter une activité"</strong> pour créer votre premier exercice.`,
        attachTo: {
          element: '#tuto-course-add-activity-button',
          on: 'bottom'
        },
        buttons: [
          {
            text: 'Activité déjà ajoutée',
            secondary: true,
            action: () => {
              this.isResearchActivity = false;
              this.shepherdService.complete();
              setTimeout(() => {
                this.continueWithDetailsTutorial(course);
              }, 100);
            }
          }
        ],
      }
    ];

    return steps;
  }

    /**
   * Continue le tutoriel après le choix de l'utilisateur
   */
  private continueWithDetailsTutorial(course: Course): void {
    // Déterminer les prochaines étapes en fonction du choix de l'utilisateur
    const nextSteps = this.buildExistingActivitySteps(course);

    this.shepherdService.startTutorial(nextSteps, {
      tourName: 'course-details-tutorial-continued',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de gestion de cours ?'
    });
  }




  /**
   * Construit les étapes pour le flux avec activité existante
   */
  private buildExistingActivitySteps(course: Course): TutorialStep[] {
    return [
      // Étapes spécifiques au cas où l'activité existe déjà
      {
        id: 'existing-activity',
        title: 'Activité existante',
        text: `Parfait ! Vous avez déjà ajouté une activité à ce cours.<br><br>
              Vous pouvez gérer cette activité, modifier ses paramètres ou en ajouter d'autres selon vos besoins.`,
        buttons: [
          {
            text: 'Continuer',
            action: () => this.shepherdService.next()
          }
        ]
      },
      {
        id: 'course-structure',
        title: 'Structure du cours',
        text: `Votre cours est maintenant structuré avec des sections et des activités.<br><br>
               <strong>Comment bien organiser votre cours ?</strong><br>
               • Utilisez des sections pour regrouper par thématiques<br>
               • Ajoutez des activités pertinentes dans chaque section<br>
               • Assurez-vous que la progression est logique pour les étudiants`,
        attachTo: {
          element: '#tuto-course-dashboard-content',
          on: 'right'
        }
      },
      {
        id: 'view-modes',
        title: 'Modes d\'affichage',
        text: `Vous pouvez changer la façon dont le contenu est affiché :<br><br>
               • <strong>Mode cartes</strong> : affichage visuel par sections<br>
               • <strong>Mode tableau</strong> : vue d'ensemble condensée<br><br>
               Choisissez le mode qui convient le mieux à votre façon de travailler.`,
        attachTo: {
          element: '#tuto-course-view-mode',
          on: 'left'
        }
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
          on: 'left'
        }
      },
      ...this.buildCommonFinalSteps(course)
    ];
  }

  /**
   * Étapes communes qui concluent le tutoriel
   */
  private buildCommonFinalSteps(course: Course): TutorialStep[] {
    return [
      {
        id: 'course-structure',
        title: 'Structure du cours',
        text: `Votre cours est maintenant structuré avec des sections et des activités.<br><br>
              <strong>Comment bien organiser votre cours ?</strong><br>
              • Utilisez des sections pour regrouper par thématiques<br>
              • Ajoutez des activités pertinentes dans chaque section<br>
              • Assurez-vous que la progression est logique pour les étudiants`,
        attachTo: {
          element: '#tuto-course-dashboard-content',
          on: 'right'
        }
      },
      // ... autres étapes finales ...
      {
        id: 'tutorial-complete',
        title: 'Félicitations ! 🎉',
        text: `Excellent travail ! Vous maîtrisez maintenant la gestion de cours sur PLaTon.<br><br>
              <strong>Ce que vous avez appris :</strong><br>
              ✅ Navigation dans l'interface de cours<br>
              ✅ Création et gestion des sections<br>
              ✅ Ajout d'activités<br>
              ✅ Fonctionnalités de recherche<br>
              ✅ Bonnes pratiques d'organisation<br><br>
              Vous êtes maintenant prêt à créer des cours engageants et bien structurés !`,
        buttons: [
          {
            text: 'Terminer le tutoriel',
            action: () => this.shepherdService.complete()
          }
        ]
      }
    ];
  }
  /**
   * Démarre un tutoriel rapide sur un aspect spécifique
   */
  startQuickTutorial(
    topic: 'sections' | 'activities' | 'search' | 'statistics',
    course?: Course
  ): void {
    let steps: TutorialStep[] = [];

    switch (topic) {
      case 'sections':
        steps = this.buildSectionsTutorialSteps();
        break;
      case 'activities':
        steps = this.buildActivitiesTutorialSteps();
        break;
      case 'search':
        steps = this.buildSearchTutorialSteps();
        break;
      case 'statistics':
        steps = this.buildStatisticsTutorialSteps();
        break;
    }

    this.shepherdService.startTutorial(steps, {
      tourName: `course-${topic}-quick-tutorial`,
      useModalOverlay: false
    });
  }

  /**
   * Tutoriel rapide sur les sections
   */
  private buildSectionsTutorialSteps(): TutorialStep[] {
    return [
      {
        id: 'sections-quick',
        title: 'Gestion des sections',
        text: `Les sections organisent votre cours en chapitres thématiques. Utilisez-les pour structurer votre contenu de manière logique et progressive.`,
        attachTo: {
          element: '#tuto-course-sections-container',
          on: 'right'
        }
      }
    ];
  }

  /**
   * Tutoriel rapide sur les activités
   */
  private buildActivitiesTutorialSteps(): TutorialStep[] {
    return [
      {
        id: 'activities-quick',
        title: 'Ajout d\'activités',
        text: `Cliquez sur "Ajouter une activité" dans une section pour créer des exercices, projets ou évaluations pour vos étudiants.`,
        attachTo: {
          element: '#tuto-course-add-activity-button',
          on: 'bottom'
        }
      }
    ];
  }

  /**
   * Tutoriel rapide sur la recherche
   */
  private buildSearchTutorialSteps(): TutorialStep[] {
    return [
      {
        id: 'search-quick',
        title: 'Fonction de recherche',
        text: `Important : Les activités n'apparaissent dans la recherche que si l'étudiant les a suivies au moins une fois.`,
        attachTo: {
          element: '#tuto-course-search-bar',
          on: 'bottom'
        }
      }
    ];
  }

  /**
   * Tutoriel rapide sur les statistiques
   */
  private buildStatisticsTutorialSteps(): TutorialStep[] {
    return [
      {
        id: 'statistics-quick',
        title: 'Statistiques du cours',
        text: `Suivez la progression de vos étudiants, le temps passé sur les activités et l'engagement général grâce à ces indicateurs.`,
        attachTo: {
          element: '#tuto-course-statistics',
          on: 'left'
        }
      }
    ];
  }
}