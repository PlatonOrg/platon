import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { User } from '@platon/core/common'
import { Resource } from '@platon/feature/resource/common'
import { NzMessageService } from 'ng-zorro-antd/message'

@Injectable({
  providedIn: 'root',
})
export class ResourcesTutorialService {
  private readonly router = inject(Router)
  private readonly shepherdService = inject(ShepherdService)
  private readonly message = inject(NzMessageService)

  private isFromTutorial = false

  getIsFromTutorial(): boolean {
    return this.isFromTutorial
  }

  resetTutorialFlag(): void {
    this.isFromTutorial = false
  }

  startResourcesTutorial(
    user: User,
    items: Resource[],
    hasSearched: () => boolean,
    performSearch: (query: string) => void
  ): void {
    const steps = this.buildTutorialSteps(user, items, hasSearched, performSearch)

    this.shepherdService.startTutorial(steps, {
      tourName: 'resources-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: "Voulez-vous vraiment quitter le tutoriel de l'espace de travail ?",
    })
  }

  private buildTutorialSteps(
    user: User,
    items: Resource[],
    hasSearched: () => boolean,
    performSearch: (query: string) => void
  ): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue dans votre espace de travail',
        text: `<div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--brand-text-primary); margin: 0 0 12px 0; font-weight: 600;">
                  Qu'allez-vous apprendre ?
                </h3>
                <p style="color: var(--brand-text-secondary); margin: 0 0 20px 0; line-height: 1.5;">
                  Ce tutoriel vous présente les outils pour rechercher, naviguer et gérer vos ressources pédagogiques.
                </p>
                <div style="background: var(--brand-background-components);
                            border-radius: 8px; padding: 16px; margin: 16px 0;
                            border-left: 3px solid var(--brand-color-primary);">
                  <div style="text-align: left; color: var(--brand-text-primary); font-size: 14px; line-height: 1.8;">
                    Utiliser la barre de recherche<br>
                    Naviguer dans les cercles et ressources<br>
                    Utiliser les filtres avancés<br>
                    Accéder à votre espace personnel
                  </div>
                </div>
                <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 16px 0 0 0;">
                  Durée : ~4 minutes &nbsp;|&nbsp; Interruptible à tout moment
                </p>
              </div>`,
        buttons: [
          {
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
          {
            text: 'Commencer',
            action: () => {
              this.shepherdService.next()
              this.shepherdService.disableEnterNavigation()
            },
          },
        ],
      },
      {
        id: 'workspace-title',
        title: "L'espace de travail",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 L'espace de travail centralise toutes vos
                 <strong style="color: var(--brand-text-primary);">ressources pédagogiques</strong> :
                 exercices, activités, cercles et cours.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Vous pouvez consulter les ressources auxquelles vous avez accès, ainsi que celles que vous avez créées.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-resources-title',
          on: 'bottom',
        },
      },
      {
        id: 'search-bar',
        title: 'La barre de recherche',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Saisissez un mot-clé pour trouver des ressources par
                 <strong style="color: var(--brand-text-primary);">nom, sujet, niveau ou auteur</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   La recherche s'applique à l'ensemble des ressources accessibles sur la plateforme.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-search-bar',
          on: 'bottom',
        },
      },
      {
        id: 'search-example',
        title: 'Effectuez une recherche',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Essayez de rechercher une ressource : tapez un sujet comme
                 <strong style="color: var(--brand-text-primary);">"python"</strong> ou
                 <strong style="color: var(--brand-text-primary);">"mathématiques"</strong>.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez sur <strong>J'ai fait ma recherche</strong> une fois votre recherche effectuée.
                 </p>
               </div>`,
        attachTo: {
          element: '#tuto-search-bar',
          on: 'bottom',
        },
        buttons: [
          {
            text: "J'ai fait ma recherche",
            action: () => {
              if (hasSearched()) {
                this.shepherdService.enableEnterNavigation()
                this.shepherdService.next()
              } else {
                this.shepherdService.enableEnterNavigation()
                performSearch('Python')
                setTimeout(() => this.shepherdService.next(), 100)
              }
            },
          },
        ],
        when: {
          show: () => {
            const searchBar = document.querySelector('#tuto-resources-searchbar') as HTMLElement
            if (searchBar) {
              searchBar.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.3)'
              searchBar.style.borderRadius = '8px'
            }
          },
          hide: () => {
            const searchBar = document.querySelector('#tuto-resources-searchbar') as HTMLElement
            if (searchBar) {
              searchBar.style.boxShadow = ''
              searchBar.style.borderRadius = ''
            }
          },
        },
      },
    ]

    steps.push(
      {
        id: 'search-results',
        title: 'Les résultats de recherche',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Chaque carte représente une ressource avec ses informations essentielles :
                 <strong style="color: var(--brand-text-primary);">nom, type, auteur et statistiques d'usage</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Cliquez sur une ressource pour consulter sa page de détail.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-resources-list',
          on: 'top',
        },
        when: {
          show: () => this.waitForResults(items, hasSearched),
        },
      },
      {
        id: 'resource-actions',
        title: 'Actions disponibles sur une ressource',
        text: this.buildResourceActionsHTML(),
        when: {
          show: () => this.highlightFirstResource(),
        },
      }
    )

    steps.push(
      {
        id: 'filters',
        title: 'Filtres de recherche',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Affinez vos résultats grâce aux filtres : <strong style="color: var(--brand-text-primary);">type, statut, niveau, sujet</strong> et bien d'autres critères.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Le bouton filtre se trouve dans la barre de recherche, à droite du champ de saisie.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-resources-filters',
          on: 'bottom',
        },
      },
      {
        id: 'tree-view',
        title: 'Vue en arborescence',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce bouton affiche la <strong style="color: var(--brand-text-primary);">structure hiérarchique</strong>
                 de vos cercles et ressources, comme un explorateur de fichiers.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Utile pour visualiser l'organisation de votre contenu pédagogique en un coup d'œil.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-resources-tree-button',
          on: 'bottom',
        },
      },
      {
        id: 'sidebar',
        title: 'Le panneau latéral',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce panneau donne un accès rapide à votre
                 <strong style="color: var(--brand-text-primary);">espace personnel</strong>
                 et à votre <strong style="color: var(--brand-text-primary);">historique de navigation</strong>.
               </p>`,
        attachTo: {
          element: '#tuto-resources-sidebar',
          on: 'left',
        },
      },
      {
        id: 'collapse-button',
        title: 'Réduire le panneau latéral',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0;">
                 Ce bouton permet de <strong style="color: var(--brand-text-primary);">masquer ou afficher</strong>
                 le panneau latéral pour agrandir la zone de résultats.
               </p>`,
        attachTo: {
          element: '#tuto-resources-collapse-button',
          on: 'left',
        },
      },
      {
        id: 'my-space',
        title: 'Mon espace personnel',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Votre <strong style="color: var(--brand-text-primary);">cercle personnel</strong> est l'espace
                 dédié à vos propres créations. Les ressources que vous y ajoutez sont privées par défaut.
               </p>`,
        attachTo: {
          element: '#tuto-resources-my-space',
          on: 'left',
        },
      },
      {
        id: 'recent-views',
        title: 'Historique de consultation',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0;">
                 Retrouvez ici les <strong style="color: var(--brand-text-primary);">ressources consultées récemment</strong>
                 pour reprendre rapidement votre travail là où vous vous étiez arrêté.
               </p>`,
        attachTo: {
          element: '#tuto-resources-recent-views',
          on: 'left',
        },
      },
      {
        id: 'filter-button-intro',
        title: 'Utilisons les filtres avancés',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Maintenant que vous connaissez l'interface, voyons comment filtrer précisément les résultats.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez sur le bouton filtre dans la barre de recherche pour continuer.
                 </p>
               </div>`,
        attachTo: {
          element: '#tuto_filter_list',
          on: 'bottom',
        },
        advanceOn: {
          selector: '#tuto_filter_list',
          event: 'click',
        },
        buttons: [
          {
            text: 'Précédent',
            secondary: true,
            action: () => {
              this.shepherdService.previous()
            },
          },
        ],
        when: {
          show: () => {
            const filterButton = document.querySelector('#tuto_filter_list') as HTMLElement
            if (filterButton) {
              filterButton.style.animation = 'pulseButton 2s ease-in-out infinite'
              filterButton.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5)'
            }
          },
          hide: () => {
            const filterButton = document.querySelector('#tuto_filter_list') as HTMLElement
            if (filterButton) {
              filterButton.style.animation = ''
              filterButton.style.boxShadow = ''
            }
          },
        },
      },
      {
        id: 'filter-drawer-intro',
        title: 'Le panneau de filtres avancés',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le panneau de filtres s'est ouvert sur la droite de votre écran.
                 Vous pouvez y affiner votre recherche selon de nombreux critères.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   Dans l'étape suivante, nous allons filtrer par type de ressource.
                 </small>
               </div>`,
        buttons: [
          {
            text: 'Suivant',
            action: () => this.shepherdService.next(),
          },
        ],
        when: {
          show: async () => {
            return this.waitForFilterDrawer()
          },
        },
      },
      {
        id: 'filter-drawer-open',
        title: 'Filtrer par type de ressource',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le panneau de filtres est maintenant ouvert. Nous allons apprendre à filtrer
                 les résultats par <strong style="color: var(--brand-text-primary);">type de ressource</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Dans l'étape suivante, repérez la section <strong>Types</strong> dans le panneau de droite.
                 </small>
               </div>`,
        buttons: [
          {
            text: 'Continuer',
            action: () => this.shepherdService.next(),
          },
        ],
        when: {
          show: async () => {
            await this.waitForFilterDrawer()
            await this.waitForElement('#tuto-recherche-avancee')

            const searchInput = document.querySelector('#tuto-search-bar') as HTMLInputElement
            if (searchInput) {
              searchInput.value = ''
              searchInput.dispatchEvent(new Event('input', { bubbles: true }))
              searchInput.dispatchEvent(new Event('change', { bubbles: true }))
              performSearch('')
            }
          },
        },
      },
      {
        id: 'select-circle-type',
        title: 'Sélectionnez le type « Cercle »',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cochez uniquement la case <strong style="color: var(--brand-text-primary);">« Cercle »</strong>
                 dans la section Types pour filtrer les résultats.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   Décochez les autres types s'ils sont déjà sélectionnés.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-types-recourses',
          on: 'left',
        },
        buttons: [
          {
            text: "J'ai coché « Cercle »",
            action: () => {
              setTimeout(() => {
                const typeSection = document.querySelector('#tuto-types-recourses')
                if (!typeSection) {
                  this.message.error('Section non trouvée. Veuillez réessayer.')
                  return
                }

                const checkboxes = typeSection.querySelectorAll('mat-checkbox')
                const { checkedLabels, totalChecked } = this.getCheckedCheckboxLabels(checkboxes)

                if (totalChecked === 1 && checkedLabels.some((label) => label.toLowerCase().includes('cercle'))) {
                  this.shepherdService.next()
                } else {
                  this.message.warning('Veuillez cocher seulement la case "Cercle" pour continuer.')
                }
              }, 100)
            },
          },
        ],
        when: {
          show: () => {
            setTimeout(() => {
              const typeSection = document.querySelector('#tuto-types-recourses') as HTMLElement
              if (typeSection) {
                typeSection.style.backgroundColor = 'rgba(var(--brand-color-primary-rgb), 0.05)'
                typeSection.style.padding = '10px'
                typeSection.style.borderRadius = '8px'
                typeSection.style.border = '2px solid rgba(var(--brand-color-primary-rgb), 0.3)'
              }
            }, 300)
          },
          hide: () => {
            const typeSection = document.querySelector('#tuto-types-recourses') as HTMLElement
            if (typeSection) {
              typeSection.style.backgroundColor = ''
              typeSection.style.padding = ''
              typeSection.style.borderRadius = ''
              typeSection.style.border = ''
            }
          },
        },
      },
      {
        id: 'apply-filters',
        title: 'Appliquer les filtres',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cliquez sur le bouton <strong style="color: var(--brand-text-primary);">Appliquer</strong>
                 pour lancer la recherche avec le filtre « Cercle » sélectionné.
               </p>`,
        attachTo: {
          element: '#tuto-apply-filters',
          on: 'top',
        },
        advanceOn: {
          selector: '#tuto-apply-filters',
          event: 'click',
        },
        buttons: [
          {
            text: 'Précédent',
            secondary: true,
            action: () => {
              this.shepherdService.previous()
            },
          },
        ],
        when: {
          show: () => {
            const applyButton = document.querySelector('#tuto-apply-filters') as HTMLElement
            if (applyButton) {
              applyButton.style.animation = 'pulseButton 2s ease-in-out infinite'
            }
          },
          hide: () => {
            const applyButton = document.querySelector('#tuto-apply-filters') as HTMLElement
            if (applyButton) {
              applyButton.style.animation = ''
            }
          },
        },
      },
      {
        id: 'circles-list',
        title: 'Liste des cercles',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Voici les <strong style="color: var(--brand-text-primary);">cercles disponibles</strong>.
                 Chaque cercle peut contenir des exercices, activités et d'autres ressources organisées par thème.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Dans l'étape suivante, vous allez explorer le contenu d'un cercle.
                 </small>
               </div>`,
        when: {
          show: () => {
            setTimeout(() => {
              this.highlightCircles()
            }, 1000)
          },
        },
      }
    )

    const clickCircleStep: TutorialStep = {
      id: 'click-circle',
      title: 'Explorez un cercle',
      text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
               Cliquez sur le <strong style="color: var(--brand-text-primary);">premier cercle</strong>
               de la liste pour découvrir son contenu.
             </p>
             <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                         padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
               <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                 Cliquez maintenant sur le titre du premier cercle pour continuer.
               </p>
             </div>`,
      attachTo: {
        element: '#tuto-title-resource',
        on: 'bottom',
      },
      advanceOn: {
        selector: '#tuto-title-resource',
        event: 'click',
      },
      buttons: [
        {
          secondary: true,
          text: 'Précédent',
          action: () => this.shepherdService.previous(),
        },
      ],
      when: {
        show: () => {
          this.addTutorialParamToFirstCircleLinks()
        },
      },
    }

    steps.push(clickCircleStep)

    return steps
  }

  private waitForResults(items: Resource[], hasSearched: () => boolean): void {
    let attempts = 0
    const checkInterval = setInterval(() => {
      attempts++
      if (hasSearched() || items.length > 0 || attempts > 20) {
        clearInterval(checkInterval)
      }
    }, 500)
  }

  private highlightFirstResource(): void {
    setTimeout(() => {
      const firstResource = document.querySelector('resource-item') as HTMLElement
      if (firstResource) {
        firstResource.style.transition = 'all 0.3s ease'
        firstResource.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.3)'
        firstResource.style.borderRadius = '8px'

        setTimeout(() => {
          firstResource.style.boxShadow = ''
          firstResource.style.borderRadius = ''
        }, 5000)
      }
    }, 500)
  }

  private buildResourceActionsHTML(): string {
    return `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
               Chaque ressource propose plusieurs actions selon vos droits d'accès.
             </p>
             <div style="display: flex; flex-direction: column; gap: 8px;">
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 12px;">
                 <strong style="color: var(--brand-text-primary); font-size: 13px;">Consulter</strong><br>
                 <small style="color: var(--brand-text-secondary);">Cliquez sur le titre d'une ressource pour accéder à sa page de détail</small>
               </div>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 12px;">
                 <strong style="color: var(--brand-text-primary); font-size: 13px;">Éditer</strong><br>
                 <small style="color: var(--brand-text-secondary);">Modifiez le contenu si vous disposez des droits d'édition sur cette ressource</small>
               </div>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 12px;">
                 <strong style="color: var(--brand-text-primary); font-size: 13px;">Prévisualiser</strong><br>
                 <small style="color: var(--brand-text-secondary);">Consultez le rendu de la ressource sans la modifier</small>
               </div>
             </div>
             <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                         border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8); margin-top: 8px;">
               <small style="color: var(--brand-text-secondary);">
                 Les actions disponibles dépendent de vos permissions sur chaque ressource.
               </small>
             </div>`
  }

  private waitForFilterDrawer(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkDrawer = () => {
        const drawer = document.querySelector('#tuto-recherche-avancee')
        if (drawer && (drawer as HTMLElement).offsetWidth > 0) {
          setTimeout(resolve, 300)
        } else {
          setTimeout(checkDrawer, 100)
        }
      }
      checkDrawer()
      setTimeout(resolve, 3000)
    })
  }

  private isCheckboxChecked(checkbox: HTMLElement): boolean {
    const input = checkbox.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    if (input) {
      return input.checked
    }
    return checkbox.getAttribute('aria-checked') === 'true'
  }

  private getCheckedCheckboxLabels(checkboxes: NodeListOf<Element>): { checkedLabels: string[]; totalChecked: number } {
    const checkedLabels: string[] = []
    checkboxes.forEach((cb) => {
      if (this.isCheckboxChecked(cb as HTMLElement)) {
        const label = (cb as HTMLElement).textContent?.trim() ?? ''
        checkedLabels.push(label)
      }
    })
    return { checkedLabels, totalChecked: checkedLabels.length }
  }

  private highlightCircles(): void {
    const circles = document.querySelectorAll('resource-item')
    circles.forEach((circle, index) => {
      const element = circle as HTMLElement
      setTimeout(() => {
        element.style.transition = 'all 0.3s ease'
        element.style.transform = 'translateX(5px)'
        element.style.boxShadow = '0 2px 8px rgba(var(--brand-color-primary-rgb), 0.2)'

        setTimeout(() => {
          element.style.transform = ''
        }, 300)
      }, index * 100)
    })
  }

  startActionTutorial(action: 'preview' | 'edit' | 'duplicate' | 'share'): void {
    let steps: TutorialStep[] = []

    switch (action) {
      case 'preview':
        steps = [
          {
            id: 'preview-tutorial',
            title: 'Prévisualisation',
            text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0;">
                     La prévisualisation vous permet de voir le contenu d'une ressource sans la modifier.
                     C'est idéal pour explorer rapidement le contenu disponible.
                   </p>`,
          },
        ]
        break

      case 'edit':
        steps = [
          {
            id: 'edit-tutorial',
            title: 'Édition de ressource',
            text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0;">
                     L'éditeur vous permet de modifier le contenu, les métadonnées et les paramètres d'une ressource.
                     Assurez-vous de disposer des permissions nécessaires avant de modifier une ressource.
                   </p>`,
          },
        ]
        break
    }

    this.shepherdService.startTutorial(steps, {
      tourName: `${action}-action-tutorial`,
      useModalOverlay: false,
    })
  }

  private waitForElement(selector: string): Promise<HTMLElement> {
    return new Promise<HTMLElement>((resolve) => {
      const checkElement = () => {
        const element = document.querySelector(selector) as HTMLElement
        if (element) {
          setTimeout(() => {
            resolve(element)
          }, 100)
        } else {
          setTimeout(checkElement, 100)
        }
      }

      checkElement()

      setTimeout(() => {
        resolve(document.querySelector(selector) as HTMLElement)
      }, 5000)
    })
  }

  /**
   * Ajoute le paramètre fromTutorial aux liens du premier cercle via #tuto-title-resource.
   * On utilise ce sélecteur plutôt que resource-item:first-child
   * car Angular insère des view containers qui cassent le :first-child.
   */
  private addTutorialParamToFirstCircleLinks(): void {
    const titleResource = document.querySelector('#tuto-title-resource') as HTMLElement
    if (!titleResource) return

    const links = titleResource.querySelectorAll('a[href*="/resources/"]') as NodeListOf<HTMLAnchorElement>

    links.forEach((link) => {
      if (!link.dataset['originalHref']) {
        link.dataset['originalHref'] = link.href
      }

      const url = new URL(link.href)
      url.searchParams.set('fromTutorial', 'true')
      link.href = url.toString()
    })

    titleResource.addEventListener(
      'click',
      () => {
        this.isFromTutorial = true
      },
      { once: true }
    )
  }
}
