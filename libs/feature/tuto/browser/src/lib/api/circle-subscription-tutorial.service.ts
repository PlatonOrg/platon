import { Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { ShepherdService } from './shepherd/shepherd.service'
import { TutorialStep } from './shepherd/shepherd.service'
import { User, UserRoles } from '@platon/core/common'
import { ToolbarTutorialService } from './toolbar-tutorial.service'
import { CircleTree, flattenCircleTree } from '@platon/feature/resource/common'

import { ResourceService } from '@platon/feature/resource/browser'
import { firstValueFrom } from 'rxjs'
import { DialogService } from '@platon/core/browser'

@Injectable({
  providedIn: 'root',
})
export class CircleSubscriptionTutorialService {
  private readonly shepherdService = inject(ShepherdService)
  private readonly router = inject(Router)
  private readonly resourceService = inject(ResourceService)
  private readonly dialogService = inject(DialogService)
  private readonly circleSubscriptionCompletedKey = 'tutoSeen'
  private user?: User

  private selectedCircles = signal<string>('')
  private readonly availableCircles = signal<CircleTree[]>([])
  private circleChoise = signal<string>('')

  constructor(private readonly toolbarTutorialService: ToolbarTutorialService) {}

  private async loadCircles(): Promise<void> {
    this.selectedCircles.set('')
    const tree = await firstValueFrom(this.resourceService.tree())
    this.availableCircles.set(
      flattenCircleTree(tree).filter((c) => c.code !== this.user?.username && c.code !== 'platon')
    )
  }

  private isMemberOfAnyCircle(): boolean {
    for (const circle of this.availableCircles()) {
      if (circle.permissions?.write) {
        return true
      }
    }
    return false
  }

  async startCircleSubscriptionTutorial(user: User): Promise<void> {
    this.user = user

    if (this.hasCompletedCircleSubscription() || user.role !== UserRoles.teacher) {
      return
    }

    await this.loadCircles()

    if (this.isMemberOfAnyCircle()) {
      this.completeAndStartMainTutorial()
      return
    }
    const steps = this.buildCircleSubscriptionSteps(user)

    this.shepherdService.startTutorial(steps, {
      tourName: 'circle-subscription-tutorial',
      useModalOverlay: true,
      confirmCancel: false,
      exitOnEsc: false,
      keyboardNavigation: false,
      showCancelIcon: false, // Désactiver l'icône de fermeture pour forcer l'inscription
    })
  }

  /**
   * Construit les étapes du tutoriel d'inscription aux cercles
   */
  private buildCircleSubscriptionSteps(user: User): TutorialStep[] {
    return [
      {
        id: 'welcome-circles',
        title: 'Bienvenue sur PLaTon !',
        text: `
        <div style="text-align: center; padding: 20px;">
        <h3 style="margin-bottom: 16px; color: var(--brand-text-primary);">
          Rejoignez la communauté PLaTon
        </h3>

        <p style="color: var(--brand-text-secondary); margin-bottom: 20px; line-height: 1.6;">
          Avant de commencer, vous devez rejoindre un <strong>cercle</strong>
          pour accéder aux ressources pédagogiques partagées par la communauté.
        </p>

        <div style="background: var(--brand-background-components);
              border-radius: 8px;
              padding: 16px;
              margin: 16px 0;
              border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
          <strong style="color: var(--brand-text-primary);">Pourquoi rejoindre des cercles ?</strong>
          <div style="text-align: left; margin-top: 12px; color: var(--brand-text-secondary);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 20px; min-width: 24px;">📂</span>
            <span><strong>Accès aux ressources</strong> : exercices, activités et templates prêts à l'emploi</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 20px; min-width: 24px;">🤝</span>
            <span><strong>Collaboration</strong> : partagez et améliorez les ressources avec d'autres enseignants</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 20px; min-width: 24px;">📚</span>
            <span><strong>Organisation</strong> : structurez votre contenu par thématique</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px; min-width: 24px;">🔔</span>
            <span><strong>Notifications</strong> : restez informé des nouvelles ressources</span>
          </div>
          </div>
        </div>

        <p style="color: var(--brand-text-secondary); font-size: 14px; margin-top: 16px;">
          <strong>Note :</strong> Vous pourrez toujours rejoindre ou quitter des cercles plus tard.
        </p>
        </div>
      `,
        buttons: [
          {
            text: 'Découvrir les cercles disponibles',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'select-circles',
        title: '📂 Choisissez votre cercle',
        text: this.buildCirclesSelectionHTML(),
        buttons: [
          {
            text: 'Précédent',
            secondary: true,
            action: () => this.shepherdService.previous(),
          },
          {
            text: 'Valider ma sélection',
            action: () => this.validateSelection(),
          },
        ],
        when: {
          show: () => this.setupCircleSelectionListeners(),
        },
      },
      {
        id: 'subscription-complete',
        title: 'Inscription réussie !',
        text: '<div id="completion-text"></div>',
        buttons: [
          {
            text: 'Commencer le tutoriel de découverte',
            action: () => this.completeAndStartMainTutorial(),
          },
        ],
        when: {
          show: () => this.displayCompletionMessage(),
        },
      },
    ]
  }

  /**
   * Génère le HTML pour la sélection des cercles
   */
  private buildCirclesSelectionHTML(): string {
    let html = `
      <div style="padding: 16px;">
        <p style="margin-bottom: 20px; color: var(--brand-text-secondary);">
          Sélectionnez un cercle pour continuer.
          Cliquez sur le cercle qui vous intéresse :
        </p>
        <div id="circles-selection-container" style="max-height: 400px; overflow-y: auto;">
    `

    this.availableCircles().forEach((circle) => {
      html += `
        <div class="circle-selection-item"
             data-circle-id="${circle.id}"
             style="padding: 16px;
                    margin: 8px 0;
                    border: 2px solid var(--brand-border-color-light);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: var(--brand-background-components);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="circle-checkbox"
                 style="width: 24px;
                        height: 24px;
                        border: 2px solid var(--brand-border-color-light);
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;">
            </div>
            <div style="flex: 1;">
              <strong style="color: var(--brand-text-primary); display: block; margin-bottom: 4px;">
                ${circle.name}
              </strong>
              <small style="color: var(--brand-text-secondary);">
                ${circle.code || 'Aucune description disponible'}
              </small>
            </div>
          </div>
        </div>
      `
    })

    html += `
        </div>
        <div id="selection-counter" style="margin-top: 16px;
                                           padding: 12px;
                                           background: var(--brand-background-components);
                                           border-radius: 8px;
                                           text-align: center;
                                           color: var(--brand-text-secondary);">
          Aucun cercle sélectionné
        </div>
      </div>
    `

    return html
  }

  /**
   * Configure les listeners pour la sélection des cercles
   */
  private setupCircleSelectionListeners(): void {
    setTimeout(() => {
      const items = document.querySelectorAll('.circle-selection-item')

      items.forEach((item) => {
        item.addEventListener('click', () => {
          const circleId = item.getAttribute('data-circle-id')
          if (!circleId) return

          const checkbox = item.querySelector('.circle-checkbox') as HTMLElement
          const isSelected = this.selectedCircles().includes(circleId)

          if (isSelected) {
            // Désélectionner
            this.selectedCircles.set('')
            checkbox.innerHTML = ''
            checkbox.style.color = 'var(--brand-text-secondary)'
            checkbox.style.background = 'var(--brand-background-components)'
            checkbox.style.borderColor = 'var(--brand-border-color-light)'
            ;(item as HTMLElement).style.background = 'var(--brand-background-components)'
            ;(item as HTMLElement).style.borderColor = 'var(--brand-border-color-light)'
          } else {
            items.forEach((otherItem) => {
              const otherCheckbox = otherItem.querySelector('.circle-checkbox') as HTMLElement
              otherCheckbox.innerHTML = ''
              otherCheckbox.style.color = 'var(--brand-text-secondary)'
              otherCheckbox.style.background = 'var(--brand-background-components)'
              otherCheckbox.style.borderColor = 'var(--brand-border-color-light)'
              ;(otherItem as HTMLElement).style.borderColor = 'var(--brand-border-color-light)'
              ;(otherItem as HTMLElement).style.background = 'var(--brand-background-components)'
            })

            // Sélectionner le cercle cliqué
            this.selectedCircles.set(circleId)
            this.circleChoise.set(this.availableCircles().find((c) => c.id === circleId)?.name || '')
            checkbox.innerHTML = '✓'
            checkbox.style.color = 'white'
            checkbox.style.background = 'rgba(var(--brand-color-primary-rgb), 1)'
            checkbox.style.borderColor = 'rgba(var(--brand-color-primary-rgb), 1)'
            ;(item as HTMLElement).style.borderColor = 'rgba(var(--brand-color-primary-rgb), 0.5)'
            ;(item as HTMLElement).style.background = 'rgba(var(--brand-color-primary-rgb), 0.05)'
          }

          this.updateSelectionCounter()
        })
      })
    }, 100)
  }

  private updateSelectionCounter(): void {
    const counter = document.getElementById('selection-counter')
    if (counter) {
      const count = this.selectedCircles().length

      if (count === 0) {
        counter.innerHTML = 'Aucun cercle sélectionné'
        counter.style.color = 'var(--brand-color-error)'
      } else {
        counter.innerHTML = '✓ Cercle sélectionné'
        counter.style.color = 'var(--brand-color-success)'
      }
    }
  }

  /**
   * Affiche le message de complétion avec le nom du cercle
   */
  private displayCompletionMessage(): void {
    setTimeout(() => {
      const container = document.getElementById('completion-text')
      if (container) {
        const circleName = this.circleChoise() || 'votre cercle'
        container.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <h3 style="margin-bottom: 16px; color: var(--brand-text-primary);">
              Félicitations !
            </h3>

            <p style="color: var(--brand-text-secondary); margin-bottom: 20px;">
              Vous êtes maintenant membre du cercle <strong>${circleName}</strong>.
              Vous pouvez accéder à ses ressources depuis votre espace de travail.
            </p>

            <div style="background: var(--brand-background-components);
                  border-radius: 8px;
                  padding: 16px;
                  margin: 16px 0;">
              <strong style="color: var(--brand-text-primary);">Prochaines étapes :</strong>
              <div style="text-align: left; margin-top: 12px; color: var(--brand-text-secondary);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 20px; min-width: 24px;">🧭</span>
                  <span>Découvrez l'interface de PLaTon avec le tutoriel guidé</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 20px; min-width: 24px;">🔍</span>
                  <span>Explorez les ressources de vos cercles</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 20px; min-width: 24px;">➕</span>
                  <span>Créez vos premières ressources pédagogiques</span>
                </div>
              </div>
            </div>
          </div>
        `
      }
    }, 50)
  }

  /**
   * Valide la sélection et passe à l'étape suivante
   */
  private validateSelection(): void {
    if (this.selectedCircles().length === 0) {
      alert('Veuillez sélectionner un cercle pour continuer.')
      return
    }

    this.subscribeUserToCircles()
      .then(() => {
        this.shepherdService.next()
      })
      .catch(() => {
        console.error("Erreur lors de l'inscription aux cercles.")
      })
  }

  /**
   * Inscrit l'utilisateur aux cercles sélectionnés
   */
  private async subscribeUserToCircles(): Promise<void> {
    try {
      await firstValueFrom(this.resourceService.autoJoin(this.selectedCircles()))
      this.dialogService.success(`Vous avez été inscrit au cercle "${this.circleChoise()}" avec succès !`)
    } catch (error) {
      this.dialogService.error(
        'Une erreur est survenue lors de votre inscription au cercle. Veuillez réessayer plus tard.'
      )
      this.completeAndStartMainTutorial()
      //throw error;
    }
  }

  private completeAndStartMainTutorial(): void {
    this.shepherdService.complete()
    // Marquer que l'inscription aux cercles est terminée
    localStorage.setItem(this.circleSubscriptionCompletedKey, 'true')
    this.launchToolbarTutorial()
  }

  hasCompletedCircleSubscription(): boolean {
    return localStorage.getItem(this.circleSubscriptionCompletedKey) === 'true'
  }

  private launchToolbarTutorial(): void {
    setTimeout(() => {
      if (this.user) {
        this.toolbarTutorialService.startToolbarTutorial(this.user)
      }
    }, 200)
  }
}
