import { Injectable, signal } from '@angular/core'
import { Router } from '@angular/router'
import { ShepherdService } from './shepherd/shepherd.service'
import { ResourcesTutorialService } from './resources-tutorial.service'
import { SidebarTutorialService } from './sidebar-tutorial.service'
import { ToolbarTutorialService } from './toolbar-tutorial.service'
import { IdeTutorialService } from './ide-tutorial.service'
import { SharedResourceTutorialService } from './shared-resource-tutorial.service'
import { ResourceCreationTutorialService } from './resource-creation-tutorial.service'
import { TutorialSelectorModalComponent } from '../components/tutorial-selector-modal/tutorial-selector-modal.component'
import { User } from '@platon/core/common'
import { AuthService } from '@platon/core/browser'

export interface TutorialOption {
  id: string
  title: string
  description: string
  icon: string
}

@Injectable({
  providedIn: 'root',
})
export class TutorialSelectorService {
  public isModalOpen = signal(false)

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly shepherdService: ShepherdService,
    private readonly toolbarTutorialService: ToolbarTutorialService,
    private readonly resourcesTutorialService: ResourcesTutorialService,
    private readonly resourceCreationTutorialService: ResourceCreationTutorialService,
    private readonly ideTutorialService: IdeTutorialService,
    private readonly sharedResourceTutorailService: SharedResourceTutorialService
  ) {
    this.initUser()
  }

  async initUser(): Promise<void> {
    this.user = await this.authService.ready()
  }

  protected user?: User

  public readonly tutorials: TutorialOption[] = [
    {
      id: 'platform',
      title: 'Découverte de la plateforme',
      description: 'Tutoriel pour découvrir les fonctionnalités de base de la plateforme PLaTon',
      icon: 'dashboard',
    },
    {
      id: 'workspace',
      title: "Découverte de l'espace de travail",
      description: "Tutoriel pour apprendre à naviguer dans l'espace de travail et gérer les ressources",
      icon: 'folder',
    },
    {
      id: 'course-management',
      title: 'Gestion de cours',
      description: 'Créer et organiser un cours : sections, activités et contenu pédagogique',
      icon: 'book',
    },
    {
      id: 'create-resource',
      title: 'Découvrir comment créer une ressource',
      description: "Tutoriel pour apprendre à créer une ressource dans l'espace de travail",
      icon: 'add_circle_outline',
    },
    {
      id: 'ide-basics',
      title: "Découverte de l'IDE",
      description: "Maîtriser l'environnement de développement",
      icon: 'code',
    },
    {
      id: 'shared-resources',
      title: "Partage d'une ressource aux non utilisateurs de la plateforme",
      description: 'Apprendre à partager un exercice PLaTon au grand public',
      icon: 'share',
    },
  ]

  openTutorialSelector(): void {
    this.isModalOpen.set(true)
  }

  closeTutorialSelector(): void {
    this.isModalOpen.set(false)
  }

  async startTutorial(tutorialId: string): Promise<void> {
    this.shepherdService.complete()
    this.closeTutorialSelector()

    switch (tutorialId) {
      case 'platform':
        await this.router.navigate(['/dashboard'])
        setTimeout(() => {
          this.startPlatformTutorial()
        }, 500)
        break

      case 'workspace':
        await this.router.navigate(['/resources'], { queryParams: { tutorial: 'workspace' } })
        break
      case 'create-resource':
        this.createResourceTutorial()
        break
      case 'course-management':
        await this.router.navigate(['/courses'], {
          queryParams: { tutorial: 'course-management' },
        })
        break
      case 'ide-basics':
        this.ideTutorial()
        break
      case 'shared-resources':
        this.sharedResourceTutorial()
        break
      default:
        break
    }
  }

  private createResourceTutorial(): void {
    if (!this.user) return
    this.resourceCreationTutorialService.startResourceCreationTutorial(this.user)
  }

  private ideTutorial() {
    if (!this.user) return
    this.ideTutorialService.startIdeTutorial()
  }

  private sharedResourceTutorial() {
    if (!this.user) return
    this.sharedResourceTutorailService.startIdeTutorial()
  }

  /**
   * Lance le tutoriel de découverte de la plateforme
   * Commence par le tutoriel de la barre d'outils, puis enchaîne avec celui
   * de la barre latérale une fois le premier terminé
   */
  startPlatformTutorial(): void {
    if (!this.user) return
    this.toolbarTutorialService.startToolbarTutorial(this.user as User)
  }
}
