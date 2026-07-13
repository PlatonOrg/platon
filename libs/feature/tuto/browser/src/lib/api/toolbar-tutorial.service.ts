import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { User, UserRoles } from '@platon/core/common'
import { SidebarTutorialService } from './sidebar-tutorial.service'

@Injectable({
  providedIn: 'root',
})
export class ToolbarTutorialService {
  private user: User | null = null

  constructor(
    private shepherdService: ShepherdService,
    private router: Router,
    private sidebarTutorialService: SidebarTutorialService
  ) {}

  startToolbarTutorial(user: User): void {
    this.user = user
    const steps = this.buildTutorialSteps(user)

    this.shepherdService.startTutorial(steps, {
      tourName: 'toolbar-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: "Voulez-vous vraiment quitter le tutoriel de la barre d'outils ?",
    })
  }

  private buildTutorialSteps(user: User): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue dans PLaTon',
        text: `<div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--brand-text-primary); margin: 0 0 12px 0; font-weight: 600;">
                  Découvrez votre plateforme d'apprentissage
                </h3>
                <p style="color: var(--brand-text-secondary); margin: 0 0 20px 0; line-height: 1.5;">
                  Ce tutoriel vous présente les fonctionnalités essentielles de la barre d'outils PLaTon.
                </p>
                <div style="background: var(--brand-background-components);
                            border-radius: 8px; padding: 16px; margin: 16px 0;
                            border-left: 3px solid var(--brand-color-primary);">
                  <div style="text-align: left; color: var(--brand-text-primary); font-size: 14px; line-height: 1.8;">
                    Navigation dans l'interface<br>
                    Création de ressources pédagogiques<br>
                    Personnalisation des paramètres
                  </div>
                </div>
                <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 16px 0 0 0;">
                  Durée : ~2 minutes &nbsp;|&nbsp; Interruptible à tout moment
                </p>
              </div>`,
        buttons: [
          {
            text: 'Passer',
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
        id: 'menu-button',
        title: 'Ouvrir le menu de navigation',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce bouton affiche ou masque le
                 <strong style="color: var(--brand-text-primary);">menu de navigation latéral</strong>
                 pour accéder aux différentes sections de PLaTon.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Réduisez le menu pour gagner de l'espace sur les petits écrans.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-toolbar-menu-button',
          on: 'bottom',
        },
      },
    ]

    if (this.canUserCreate(user)) {
      steps.push(
        {
          id: 'menu-tutorial',
          title: 'Accéder aux tutoriels',
          text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                   Ce bouton ouvre le <strong style="color: var(--brand-text-primary);">sélecteur de tutoriels</strong>.
                   Vous pouvez relancer n'importe quel tutoriel à tout moment depuis cet endroit.
                 </p>`,
          attachTo: {
            element: '#tuto-help-button',
            on: 'bottom',
          },
        },
        {
          id: 'create-button',
          title: 'Créer une ressource',
          text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                   Ce bouton <strong style="color: var(--brand-text-primary);">+</strong> est le point d'entrée
                   pour créer n'importe quelle ressource : cours, cercles, activités ou exercices.
                 </p>
                 <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                             border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <small style="color: var(--brand-text-secondary);">
                     Un tutoriel dédié à la création de ressources est disponible dans le menu d'aide.
                   </small>
                 </div>`,
          attachTo: {
            element: '#tuto-create-menu-container',
            on: 'bottom',
          },
        }
      )
    }

    steps.push(
      {
        id: 'theme-button',
        title: "Thème d'affichage",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Choisissez le thème qui vous convient :
                 <strong style="color: var(--brand-text-primary);">clair, sombre ou automatique</strong>
                 (suit les préférences de votre système).
               </p>`,
        attachTo: {
          element: '#tuto-toolbar-theme-button',
          on: 'bottom',
        },
      },
      {
        id: 'notifications',
        title: 'Notifications',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Consultez vos <strong style="color: var(--brand-text-primary);">notifications</strong> :
                 nouvelles ressources dans vos cercles, mises à jour de cours, actions sur vos travaux.
               </p>`,
        attachTo: {
          element: '#tuto-toolbar-notifications-button',
          on: 'bottom',
        },
      },
      {
        id: 'user-avatar',
        title: 'Menu utilisateur',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Accédez à votre <strong style="color: var(--brand-text-primary);">profil</strong>,
                 modifiez vos paramètres de compte ou déconnectez-vous depuis ce menu.
               </p>`,
        attachTo: {
          element: '#tuto-user-avatar',
          on: 'bottom',
        },
      }
    )

    steps.push({
      id: 'tutorial-complete',
      title: "Barre d'outils maîtrisée",
      text: `<div style="text-align: center; padding: 20px;">
               <h3 style="color: var(--brand-text-primary); margin: 0 0 16px 0;">
                 Vous connaissez la barre d'outils PLaTon !
               </h3>
               <div style="background: var(--brand-background-components); border-radius: 8px;
                           padding: 16px; margin: 16px 0;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <div style="text-align: left; color: var(--brand-text-secondary); line-height: 1.8;">
                   Menu de navigation latéral<br>
                   Accès aux tutoriels<br>
                   Création de ressources<br>
                   Thème et notifications<br>
                   Menu utilisateur
                 </div>
               </div>
               <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 0;">
                 L'étape suivante vous présente le menu de navigation latéral.
               </p>
             </div>`,
      buttons: [
        {
          text: 'Découvrir la navigation',
          action: () => {
            this.launchSidebarTutorial()
          },
        },
      ],
    })

    return steps
  }

  private launchSidebarTutorial(): void {
    this.shepherdService.complete()

    setTimeout(() => {
      if (this.user) {
        this.sidebarTutorialService.startSidebarTutorial(this.user)
      }
    }, 200)
  }

  private canUserCreate(user: User): boolean {
    return user.role === UserRoles.admin || user.role === UserRoles.teacher
  }
}
