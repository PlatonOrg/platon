import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { User } from '@platon/core/common';
import { Resource } from '@platon/feature/resource/common';


@Injectable({
  providedIn: 'root'
})
export class ResourcesTutorialService {
  private readonly router = inject(Router)
  private readonly shepherdService = inject(ShepherdService)

  // Flag pour indiquer qu'on vient du tutoriel
  private isFromTutorial = false

  // Méthode pour vérifier si on vient du tutoriel
  getIsFromTutorial(): boolean {
    return this.isFromTutorial
  }

  // Méthode pour réinitialiser le flag
  resetTutorialFlag(): void {
    this.isFromTutorial = false
  }

  startResourcesTutorial(
    user: User,
    items: Resource[],
    hasSearched: () => boolean,
    performSearch: (query: string) => void
  ): void {
    const steps = this.buildTutorialSteps(user, items, hasSearched, performSearch);

    this.shepherdService.startTutorial(steps, {
      tourName: 'resources-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de l\'espace de travail ?'
    });
  }

  /**
   * Construit les étapes du tutoriel
   */
  private buildTutorialSteps(
    user: User,
    items: Resource[],
    hasSearched: () => boolean,
    performSearch: (query: string) => void
  ): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Bienvenue dans votre espace de travail !',
        text: 'Ce tutoriel va vous apprendre à rechercher, prévisualiser et éditer des ressources pédagogiques. Découvrons ensemble comment utiliser efficacement cet espace.',
        buttons: [
          {
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel()
          },
          {
            text: 'Commencer le tutoriel',
            action: () => { this.shepherdService.next(); this.shepherdService.disableEnterNavigation(); }
          }
        ]
      },
      {
        id: 'workspace-title',
        title: 'Espace de travail',
        text: 'Cet espace vous permet de gérer toutes vos ressources pédagogiques : exercices, activités, cercles et cours.',
        attachTo: {
          element: '#tuto-resources-title',
          on: 'bottom'
        }
      },
      {
        id: 'search-bar',
        title: 'Barre de recherche',
        text: 'Utilisez cette barre pour rechercher des ressources par nom, topic, niveau ou tout autre critère. C\'est votre outil principal pour trouver du contenu.',
        attachTo: {
          element: '#tuto-resources-searchbar',
          on: 'bottom'
        }
      },
      {
        id: 'search-example',
        title: 'Faisons une recherche !',
        text: 'Pour continuer le tutoriel, essayez de rechercher une ressource. Par exemple, tapez "python", "math", ou tout autre sujet qui vous intéresse.',
        attachTo: {
          element: '#tuto-resources-searchbar',
          on: 'bottom'
        },
        buttons: [
          {
            text: 'J\'ai fait ma recherche',
            action: () => {
              if (hasSearched()) {
                this.shepherdService.enableEnterNavigation();
                this.shepherdService.next();
              } else {
                this.shepherdService.enableEnterNavigation();
                performSearch('Demo tutoriel');
                setTimeout(() => this.shepherdService.next(), 100);
              }
            }
          }
        ],
        when: {
          show: () => {
            const searchBar = document.querySelector('#tuto-resources-searchbar') as HTMLElement;
            if (searchBar) {
              searchBar.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.3)';
              searchBar.style.borderRadius = '8px';
            }
          },
          hide: () => {
            const searchBar = document.querySelector('#tuto-resources-searchbar') as HTMLElement;
            if (searchBar) {
              searchBar.style.boxShadow = '';
              searchBar.style.borderRadius = '';
            }
          }
        }
      }
    ];

    steps.push(
      {
        id: 'search-results',
        title: 'Résultats de recherche',
        text: 'Voici les ressources trouvées. Chaque carte représente une ressource avec ses informations principales : nom, type, auteur et statistiques.',
        attachTo: {
          element: '#tuto-resources-list',
          on: 'top'
        },
        when: {
          show: () => this.waitForResults(items, hasSearched)
        }
      },
      {
        id: 'resource-actions',
        title: 'Actions sur les ressources',
        text: this.buildResourceActionsHTML(),
        when: {
          show: () => this.highlightFirstResource()
        },
      }
    );

    steps.push(
      {
        id: 'filters',
        title: 'Filtres avancés',
        text: 'Affinez votre recherche avec des filtres par type, statut, niveau, topic et plus encore. Cliquez sur le bouton filtre dans la barre de recherche.',
        attachTo: {
          element: '#tuto-resources-filters',
          on: 'bottom'
        }
      },
      {
        id: 'tree-view',
        title: 'Arbre des cercles',
        text: 'Visualisez la structure hiérarchique de vos cercles et ressources. Cela vous aide à comprendre l\'organisation de votre contenu.',
        attachTo: {
          element: '#tuto-resources-tree-button',
          on: 'bottom'
        }
      },
      {
        id: 'sidebar',
        title: 'Panneau latéral',
        text: 'Ce panneau affiche votre espace personnel et les ressources récemment consultées.',
        attachTo: {
          element: '#tuto-resources-sidebar',
          on: 'left'
        }
      },
      {
        id: 'collapse-button',
        title: 'Réduire le panneau',
        text: 'Cliquez ici pour réduire le panneau latéral et gagner de l\'espace.',
        attachTo: {
          element: '#tuto-resources-collapse-button',
          on: 'left'
        }
      },
      {
        id: 'my-space',
        title: 'Mon espace personnel',
        text: 'Votre cercle personnel où vous pouvez organiser vos propres ressources et créations.',
        attachTo: {
          element: '#tuto-resources-my-space',
          on: 'left'
        }
      },
      {
        id: 'recent-views',
        title: 'Historique',
        text: 'Retrouvez rapidement les ressources que vous avez consultées récemment.',
        attachTo: {
          element: '#tuto-resources-recent-views',
          on: 'left'
        }
      },
      {
        id: 'filter-button-intro',
        title: 'Utilisons les filtres avancés !',
        text: 'Maintenant que vous connaissez l\'interface, apprenons à filtrer précisément les résultats.</br> <b>Cliquez sur le bouton filtre dans la barre de recherche.</b>',
        attachTo: {
          element: '#tuto_filter_list',
          on: 'bottom'
        },
        advanceOn: {
          selector: '#tuto_filter_list',
          event: 'click'
        },
        buttons: [
          {
            text: 'Précédent',//'Cliquer sur le bouton filtre',
            secondary: true,
            action: () => {
              this.shepherdService.previous()
            }
          }
        ],
        when: {
          show: () => {
            const filterButton = document.querySelector('#tuto_filter_list') as HTMLElement;
            if (filterButton) {
              filterButton.style.animation = 'pulseButton 2s ease-in-out infinite';
              filterButton.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5)';
            }
          },
          hide: () => {
            const filterButton = document.querySelector('#tuto_filter_list') as HTMLElement;
            if (filterButton) {
              filterButton.style.animation = '';
              filterButton.style.boxShadow = '';
            }
          }
        }
      },
      {
        id: 'filter-drawer-intro',
        title: 'Panneau de filtres',
        text: 'Les filtres avancés vous permettent de préciser votre recherche selon différents critères.',
        buttons: [
          {
            text: 'Suivant (Entrée)',
            action: () => this.shepherdService.next(),
          }
        ],
        when: {
          show: async () => {
            return this.waitForFilterDrawer();
          }
        }
      },
      {
        id: 'filter-drawer-open',
        title: 'Panneau de recherche avancée',
        text: `<div style="text-align: center; padding: 10px;">
                <h4>🎯 Filtres avancés ouverts !</h4>
                <p>Le panneau de recherche avancée est maintenant ouvert sur la droite de votre écran.</p>
                <p><strong>Prochaine étape :</strong> Nous allons apprendre à filtrer par type de ressource dans la section mise en évidence.</p>
              </div>`,
        buttons: [
          {
            text: 'Parfait, continuons !',
            action: () => this.shepherdService.next(),
          }
        ],
        when: {
          show: async () => {
            await this.waitForFilterDrawer();
            await this.waitForElement('#tuto-recherche-avancee');

            const searchInput = document.querySelector('ui-search-bar input[type="search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.value = '';
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              searchInput.dispatchEvent(new Event('change', { bubbles: true }));
              performSearch('');
            }
          }
        }
      },
      {
        id: 'select-circle-type',
        title: 'Sélectionnez le type "Cercle"',
        text: 'Cochez la case "Cercle" pour filtrer uniquement les ressources de type Cercle. Décochez les autres types s\'ils sont sélectionnés.',
        attachTo: {
          element: '#tuto-types-recourses',
          on: 'left'
        },
        buttons: [
          {
            text: 'J\'ai coché "Cercle"',
            action: () => {
              setTimeout(() => {
                const typeSection = document.querySelector('#tuto-types-recourses');
                if (!typeSection) {
                  console.error('Section types non trouvée');
                  alert('Erreur: Section non trouvée. Veuillez réessayer.');
                  return;
                }

                const allCheckboxes = typeSection.querySelectorAll('mat-checkbox');
                let circleChecked = false;
                let caseChecked = 0;
                allCheckboxes.forEach(cb => {
                  if(this.isCheckboxChecked(cb as HTMLElement)){
                    caseChecked++;
                  }
                })
                if (caseChecked !== 1) {
                  alert('Veuillez cocher seulement la case "Cercle" pour continuer.');
                } else {
                  allCheckboxes.forEach(cb => {
                  const formControlName = (cb as HTMLElement).getAttribute('formcontrolname') ||
                                         (cb as HTMLElement).getAttribute('formControlName') ||
                                         (cb as HTMLElement).getAttribute('ng-reflect-name');
                  const isChecked = this.isCheckboxChecked(cb as HTMLElement);
                  if (formControlName === 'CIRCLE' && isChecked) {
                    circleChecked = true;
                  }
                });

                  if (circleChecked) {
                    this.shepherdService.next();
                  } else {
                    alert('Veuillez cocher la case "Cercle" pour continuer.');
                  }
                }
              }, 100);
            }
          }
        ],
        when: {
          show: () => {
            setTimeout(() => {
              const typeSection = document.querySelector('#tuto-types-recourses') as HTMLElement;
              if (typeSection) {
                typeSection.style.backgroundColor = 'rgba(var(--brand-color-primary-rgb), 0.05)';
                typeSection.style.padding = '10px';
                typeSection.style.borderRadius = '8px';
                typeSection.style.border = '2px solid rgba(var(--brand-color-primary-rgb), 0.3)';
              }
            }, 300);
          },
          hide: () => {
            const typeSection = document.querySelector('#tuto-types-recourses') as HTMLElement;
            if (typeSection) {
              typeSection.style.backgroundColor = '';
              typeSection.style.padding = '';
              typeSection.style.borderRadius = '';
              typeSection.style.border = '';
            }
          }
        }
      },
      {
        id: 'apply-filters',
        title: 'Appliquez les filtres',
        text: 'Parfait ! Maintenant cliquez sur le bouton "Appliquer" pour voir uniquement les cercles.',
        attachTo: {
          element: 'button[color="primary"]',
          on: 'top'
        },
        advanceOn: {
          selector: 'button[color="primary"]',
          event: 'click'
        },
        buttons: [
          {
            text: 'Précédent',
            secondary: true,
            action: () => {
              this.shepherdService.previous()
            }
          },
        ],
        when: {
          show: () => {
            const applyButton = document.querySelector('button[color="primary"]') as HTMLElement;
            if (applyButton) {
              applyButton.style.animation = 'pulseButton 2s ease-in-out infinite';
            }
          },
          hide: () => {
            const applyButton = document.querySelector('button[color="primary"]') as HTMLElement;
            if (applyButton) {
              applyButton.style.animation = '';
            }
          }
        }
      },
      {
        id: 'circles-list',
        title: 'Liste des cercles',
        text: 'Voici tous les cercles disponibles ! Chaque cercle peut contenir des exercices, activités et autres ressources.',
        when: {
          show: () => {
            setTimeout(() => {
              this.highlightCircles();
            }, 1000);
          }
        }
      },
    );

    const clickCircleStep: TutorialStep = {
      id: 'click-circle',
      title: 'Explorez le premier cercle',
      text: 'Cliquez sur le <strong>premier cercle</strong> de la liste pour découvrir son contenu et continuer le tutoriel.',
      attachTo: {
        element: '#tuto-title-resource',
        on: 'bottom'
      },
      advanceOn: {
        selector: '#tuto-title-resource',
        event: 'click'
      },
      buttons: [
        {
          text: 'Cliquer sur le premier cercle',
          action: () => this.clickFirstCircle()
        }
      ],
      when: {
        show: () => {
          this.addTutorialParamToFirstCircleLinks()
        },
        hide: () => {
        }
      }
    }

    steps.push(clickCircleStep)

    return steps;
  }

  /**
   * Attend que les résultats soient chargés
   */
  private waitForResults(items: Resource[], hasSearched: () => boolean): void {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (hasSearched() || items.length > 0 || attempts > 20) {
        clearInterval(checkInterval);
      }
    }, 500);
  }

  /**
   * Met en évidence la première ressource
   */
  private highlightFirstResource(): void {
    setTimeout(() => {
      const firstResource = document.querySelector('resource-item:first-child') as HTMLElement;
      if (firstResource) {
        firstResource.style.transition = 'all 0.3s ease';
        firstResource.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.3)';
        firstResource.style.borderRadius = '8px';

        setTimeout(() => {
          firstResource.style.boxShadow = '';
          firstResource.style.borderRadius = '';
        }, 5000);
      }
    }, 500);
  }

  /**
   * Construit le HTML pour les actions sur les ressources
   */
  private buildResourceActionsHTML(): string {
    return `
      <div style="padding: 20px; max-width: 400px;">
      <h3 style="margin-bottom: 16px; font-weight: 600;">Actions disponibles sur chaque ressource :</h3>

      <div style="margin-bottom: 16px;">

        <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <svg viewBox="64 64 896 896" focusable="false" fill="currentColor" width="3.5em" height="3.5em" data-icon="edit" aria-hidden="true" style="margin-right: 16px;"><path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"></path></svg>
        <div>
          <strong>Éditer</strong>
          <p style="margin: 4px 0; font-size: 14px; color: var(--brand-text-secondary);">
          Cliquez sur le bouton crayon pour modifier la ressource (si vous en avez les droits).
          </p>
        </div>
        </div>

        <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <svg viewBox="64 64 896 896" focusable="false" fill="currentColor" width="3.5em" height="3.5em" data-icon="play-circle" aria-hidden="true" style="margin-right: 16px;"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path><path d="M719.4 499.1l-296.1-215A15.9 15.9 0 00398 297v430c0 13.1 14.8 20.5 25.3 12.9l296.1-215a15.9 15.9 0 000-25.8zm-257.6 134V390.9L628.5 512 461.8 633.1z"></path></svg>
        <div>
          <strong>Prévisualiser</strong>
          <p style="margin: 4px 0; font-size: 14px; color: var(--brand-text-secondary);">
          Cliquez sur le titre ou l'icône prévisualisée pour voir le contenu de la ressource sans l'ouvrir en édition.
          </p>
        </div>
        </div>
      </div>

      <div style="padding: 12px; background: var(--brand-background-components); border-radius: 8px; margin-top: 16px;">
        <p style="margin: 0; font-size: 14px;">
        <strong>💡 Astuce :</strong> Les actions disponibles dépendent de vos permissions sur chaque ressource.
        </p>
      </div>
      </div>
    `;
  }

  /**
   * Attend que le drawer de filtres soit ouvert et visible
   */
  private waitForFilterDrawer(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkDrawer = () => {
        const drawer = document.querySelector('.ant-drawer-content-wrapper');
        if (drawer && (drawer as HTMLElement).offsetWidth > 0) {
          setTimeout(() => {
            resolve();
          }, 300);
        } else {
          setTimeout(checkDrawer, 100);
        }
      };
      checkDrawer();
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  /**
   * Vérifie si une checkbox est cochée
   */
  private isCheckboxChecked(checkbox: HTMLElement): boolean {
    const input = checkbox.querySelector('input[type="checkbox"]');
    if (input && (input as HTMLInputElement).checked) {
      return true;
    }

    const isCheckedClass = checkbox.classList.contains('mat-checkbox-checked') ||
                          checkbox.classList.contains('mat-mdc-checkbox-checked');
    if (isCheckedClass) {
      return true;
    }

    const antChecked = checkbox.classList.contains('ant-checkbox-checked');
    if (antChecked) {
      return true;
    }

    const ariaChecked = checkbox.getAttribute('aria-checked');
    if (ariaChecked === 'true') {
      return true;
    }

    return false;
  }

  /**
   * Met en évidence les cercles dans la liste
   */
  private highlightCircles(): void {
    const circles = document.querySelectorAll('resource-item');
    circles.forEach((circle, index) => {
      const element = circle as HTMLElement;
      setTimeout(() => {
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'translateX(5px)';
        element.style.boxShadow = '0 2px 8px rgba(var(--brand-color-primary-rgb), 0.2)';

        setTimeout(() => {
          element.style.transform = '';
        }, 300);
      }, index * 100);
    });
  }
  startActionTutorial(action: 'preview' | 'edit' | 'duplicate' | 'share'): void {
    let steps: TutorialStep[] = [];

    switch (action) {
      case 'preview':
        steps = [{
          id: 'preview-tutorial',
          title: 'Prévisualisation',
          text: 'La prévisualisation vous permet de voir le contenu d\'une ressource sans la modifier. C\'est idéal pour explorer rapidement le contenu disponible.',
        }];
        break;

      case 'edit':
        steps = [{
          id: 'edit-tutorial',
          title: 'Édition de ressource',
          text: 'L\'éditeur vous permet de modifier le contenu, les métadonnées et les paramètres d\'une ressource. Assurez-vous d\'avoir les permissions nécessaires.',
        }];
        break;
    }

    this.shepherdService.startTutorial(steps, {
      tourName: `${action}-action-tutorial`,
      useModalOverlay: false
    });
  }

  /**
   * Attend qu'un élément spécifique soit présent dans le DOM
   */
  private waitForElement(selector: string): Promise<HTMLElement> {
    return new Promise<HTMLElement>((resolve) => {
      const checkElement = () => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          setTimeout(() => {
            resolve(element);
          }, 100);
        } else {
          setTimeout(checkElement, 100);
        }
      };

      checkElement();

      setTimeout(() => {
        console.warn(`Timeout waiting for element: ${selector}`);
        resolve(document.querySelector(selector) as HTMLElement);
      }, 5000);
    });
  }

  /**
   * Force le clic sur le premier cercle
   */
  private clickFirstCircle(): void {
    const firstCircle = document.querySelector('resource-item:first-child') as HTMLElement
    if (firstCircle) {
      this.isFromTutorial = true

      const resourceId = this.getResourceIdFromElement(firstCircle)

      if (resourceId) {
        this.router.navigate(['/resources', resourceId], {
          queryParams: { fromTutorial: 'true' }
        }).then(() => {
          this.shepherdService.complete()
        })
      } else {
        firstCircle.click()
      }
    }
  }

  /**
   * Ajoute le paramètre fromTutorial aux liens du premier cercle
   */
  private addTutorialParamToFirstCircleLinks(): void {
    const firstCircle = document.querySelector('resource-item:first-child') as HTMLElement
    if (!firstCircle) return

    const links = firstCircle.querySelectorAll('a[href*="/resources/"]') as NodeListOf<HTMLAnchorElement>

    links.forEach(link => {
      if (!link.dataset.originalHref) {
        link.dataset.originalHref = link.href
      }

      const url = new URL(link.href)
      url.searchParams.set('fromTutorial', 'true')
      link.href = url.toString()
    })

    firstCircle.addEventListener('click', this.handleFirstCircleClick.bind(this), { once: false })
  }

  /**
   * Gère le clic sur le premier cercle
   */
  private handleFirstCircleClick = (event: Event): void => {
    const target = event.target as HTMLElement
    const link = target.closest('a[href*="/resources/"]') as HTMLAnchorElement

    if (!link) {
      event.preventDefault()
      this.clickFirstCircle()
    } else {
      this.clickFirstCircle()
    }
  }

  /**
   * Met en évidence le premier cercle
   */
  private highlightFirstCircle(): void {
    setTimeout(() => {
      const firstCircle = document.querySelector('resource-item:first-child') as HTMLElement
      if (firstCircle) {
        firstCircle.style.transition = 'all 0.3s ease'
        firstCircle.style.transform = 'scale(1.02)'
        firstCircle.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5)'
        firstCircle.style.borderRadius = '8px'
        firstCircle.style.animation = 'pulseHighlight 2s ease-in-out infinite'

        this.addPulseAnimation()
      }
    }, 300)
  }

  /**
   * Ajoute l'animation CSS pour le pulse
   */
  private addPulseAnimation(): void {
    const styleId = 'tutorial-pulse-animation'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @keyframes pulseHighlight {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(var(--brand-color-primary-rgb), 0.3);
          }
        }
        @keyframes pulseButton {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(var(--brand-color-primary-rgb), 0.3);
          }
        }
      `
      document.head.appendChild(style)
    }
  }

  /**
   * Récupère l'ID de la ressource depuis l'élément DOM
   */
  private getResourceIdFromElement(element: HTMLElement): string | null {
    const resourceId = element.getAttribute('data-resource-id') ||
                      element.getAttribute('data-id') ||
                      element.querySelector('[data-resource-id]')?.getAttribute('data-resource-id')

    if (resourceId) {
      return resourceId
    }

    const link = element.querySelector('a[href*="/resources/"]') as HTMLAnchorElement
    if (link) {
      const matches = link.href.match(/\/resources\/([^\/\?]+)/)
      return matches ? matches[1] : null
    }

    return null
  }
}
