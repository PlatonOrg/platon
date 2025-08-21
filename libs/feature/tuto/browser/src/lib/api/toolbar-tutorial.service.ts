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
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel()
          },
          {
            text: 'Commencer le tutoriel',
            action: () => this.shepherdService.next()
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

    steps.push({
      id: 'tutorial-complete',
      title: 'Tutoriel toolbar terminé !',
      text: 'Vous connaissez maintenant les principales fonctionnalités de la barre d\'outils PLaTon. Bonne exploration !',
      buttons: [
        {
          text: 'Découvrir le sidebar',
          action: () => this.shepherdService.complete()
        }
      ]
    });

    return steps;
  }

  /**
   * Vérifie si l'utilisateur peut créer des ressources
   */
  private canUserCreate(user: User): boolean {
    return user.role === UserRoles.admin || user.role === UserRoles.teacher;
  }

}
