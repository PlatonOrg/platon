import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ShepherdService } from './shepherd/shepherd.service';
import { ResourcesTutorialService } from './resources-tutorial.service';
import {SidebarTutorialService} from './sidebar-tutorial.service';
import {ToolbarTutorialService} from './toolbar-tutorial.service'
import {ResourceCreationTutorialService} from './resource-creation-tutorial.service';
import {TutorialSelectorModalComponent} from '../components/tutorial-selector-modal/TutorialSelectorModal.component';
import {User} from '@platon/core/common';
import { AuthService } from '@platon/core/browser'



export interface TutorialOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class TutorialSelectorService {

  public isModalOpen = signal(false);
  private currentTutorialChain: string[] = [];
  private currentChainIndex = 0;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly shepherdService: ShepherdService,
     private readonly sidebarTutorialService: SidebarTutorialService,
    private readonly toolbarTutorialService: ToolbarTutorialService,
    private readonly resourcesTutorialService: ResourcesTutorialService,
    private readonly resourceCreationTutorialService: ResourceCreationTutorialService
  ) {
  }

  protected user?: User


  public readonly tutorials: TutorialOption[] = [
    {
      id: 'platform',
      title: 'Découverte de la plateforme',
      description: 'Tutoriel pour découvrir les fonctionnalités de base de la plateforme PLaTon',
      icon: 'dashboard'
    },
    {
      id: 'workspace',
      title: 'Découverte de l\'espace de travail',
      description: 'Tutoriel pour apprendre à naviguer dans l\'espace de travail et gérer les ressources',
      icon: 'folder'
    },
    {
      id: 'course-management',
      title: 'Gestion de cours',
      description: 'Organiser et gérer un cours : sections, activités et contenu pédagogique',
      icon: 'book'
    },
    {
      id: 'create-resource',
      title: 'Découvrir comment créer une ressource',
      description: 'Tutoriel pour apprendre à créer une ressource dans l\'espace de travail',
      icon: 'add_circle_outline'
    }
  ];


  openTutorialSelector(): void {
    this.isModalOpen.set(true);
  }

  closeTutorialSelector(): void {
    this.isModalOpen.set(false);
  }

  async startTutorial(tutorialId: string): Promise<void> {
    this.shepherdService.complete();
    this.closeTutorialSelector();
    this.user = await this.authService.ready()


    switch (tutorialId) {
      case 'platform':
        await this.router.navigate(['/dashboard']);
        setTimeout(() => {
          this.startPlatformTutorial();
        }, 500);
        break;

      case 'workspace':
        await this.router.navigate(['/resources'], { queryParams : { tutorial: 'workspace'}});

        break;
      case 'create-resource':
        this.createResourceTutorial();
        break;
      case 'course-management':
        await this.router.navigate(
          ['/courses'],
          {
            queryParams: { tutorial: 'course-management' }
          }
        );
        break;
      default:
        console.error(`Tutoriel inconnu: ${tutorialId}`);
    }
  }

  private createResourceTutorial(): void {
    if (!this.user) return;
    this.resourceCreationTutorialService.startResourceCreationTutorial(this.user);
  }


 /**
   * Lance le tutoriel de découverte de la plateforme
   * Commence par le tutoriel de la barre d'outils, puis enchaîne avec celui
   * de la barre latérale une fois le premier terminé
   */
  private startPlatformTutorial(): void {
    if (!this.user) return;

    this.currentTutorialChain = ['toolbar', 'sidebar'];
    this.currentChainIndex = 0;

    this.executeNextTutorialInChain();
  }

  /**
   * Exécute le prochain tutoriel dans la chaîne
   */
  private executeNextTutorialInChain(): void {
    if (!this.user || this.currentChainIndex >= this.currentTutorialChain.length) {
      this.currentTutorialChain = [];
      this.currentChainIndex = 0;
      return;
    }

    const currentTutorial = this.currentTutorialChain[this.currentChainIndex];
    this.setupTutorialCompletionListener();

    switch (currentTutorial) {
      case 'toolbar':
        this.toolbarTutorialService.startToolbarTutorial(this.user as User);
        break;

      case 'sidebar':
        this.sidebarTutorialService.startSidebarTutorial(this.user as User);
        break;

      default:
        console.error(`Tutoriel inconnu dans la chaîne: ${currentTutorial}`);
        this.currentChainIndex++;
        this.executeNextTutorialInChain();
    }
  }


  /**
   * Configure l'écoute de la fin du tutoriel actuel
   */
  private setupTutorialCompletionListener(): void {
    this.removeTutorialCompletionListener();

    const checkTutorialCompletion = () => {
      if (!this.shepherdService.isActive()) {
        // Supprimer le listener
        this.removeTutorialCompletionListener();

        // Passer au tutoriel suivant
        this.currentChainIndex++;

        setTimeout(() => {
          this.executeNextTutorialInChain();
        }, 10);
      }
    };

    this.tutorialCompletionInterval = setInterval(checkTutorialCompletion, 500);
  }

   private tutorialCompletionInterval?: NodeJS.Timeout;


  private removeTutorialCompletionListener(): void {
    if (this.tutorialCompletionInterval) {
      clearInterval(this.tutorialCompletionInterval);
      this.tutorialCompletionInterval = undefined;
    }
  }


}
