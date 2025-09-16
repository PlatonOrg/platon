import { Injectable } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'

@Injectable({ providedIn: 'root' })
export class IdeTutorialService {

  constructor(
    private readonly shepherd: ShepherdService,
  ) {}

  startIdeTutorial(): void {
    const steps = this.buildSteps()
    this.shepherd.startTutorial(steps, {
      tourName: 'ide-basics',
      useModalOverlay: false
    })
  }

  private buildSteps(): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue dans l’IDE PLaTon',
        text: "Le tutoriel est en cours de construction. Il arrive très prochainement.",
        buttons: [
          { text: 'Compris', action: () => this.shepherd.complete() },
          // { text: 'Commencer', action: () => this.shepherd.next() },
          // { text: 'Passer', secondary: true, action: () => this.shepherd.cancel() }
        ]
      },
      /*{
        id: 'sidebar',
        title: 'Barre latérale',
        text: `Navigation multi‑sections : explorateur, recherche, documentation, réglages.`,
        attachTo: { element: '#tuto-ide-sidebar', on: 'right' }
      },
      {
        id: 'explorer',
        title: 'Explorateur de fichiers',
        text: `Arborescence de la ressource. Clic droit : actions (renommer, supprimer, extraire zip…). Glisser‑déposer pour importer.`,
        attachTo: { element: '#tuto-ide-explorer', on: 'right' }
      },
      {
        id: 'search',
        title: 'Recherche',
        text: `Recherche textuelle dans les fichiers de la ressource courante.`,
        attachTo: { element: '#tuto-ide-search', on: 'right' }
      },
      {
        id: 'docs',
        title: 'Documentation intégrée',
        text: `Guides & références sans quitter l’IDE.`,
        attachTo: { element: '#tuto-ide-docs', on: 'right' }
      },
      {
        id: 'settings',
        title: 'Paramètres',
        text: `Thème, préférences d’édition, comportement de l’IDE.`,
        attachTo: { element: '#tuto-ide-settings', on: 'right' }
      },
      {
        id: 'editor',
        title: 'Zone d’édition',
        text: `Édition adaptative (code, PDF, images, vidéos, fichiers PLaTon). Barre d’outils contextuelle.`,
        attachTo: { element: '#tuto-ide-editor-area', on: 'left' }
      },
      {
        id: 'infobar',
        title: 'Zone d’information',
        text: `Messages, diagnostics, retours contextuels.`,
        attachTo: { element: '#tuto-ide-infobar', on: 'top' }
      },
      {
        id: 'statusbar',
        title: 'Barre d’état',
        text: `Langage, position curseur, encodage, indentation.`,
        attachTo: { element: '#tuto-ide-statusbar', on: 'top' }
      },
      {
        id: 'shortcuts',
        title: 'Raccourcis utiles',
        text: `Ctrl+S : sauvegarder<br>Ctrl+F : rechercher<br>Ctrl+Shift+F : recherche globale<br>Ctrl+/ : commenter<br>F11 : plein écran`,
        buttons: [{ text: 'Suivant', action: () => this.shepherd.next() }]
      },
      {
        id: 'finish',
        title: 'Tutoriel terminé',
        text: `Vous pouvez relancer ce tutoriel via le sélecteur d’aide.`,
        buttons: [{ text: 'Terminer', action: () => this.shepherd.complete() }]
      }*/
    ]
    return steps
  }
}