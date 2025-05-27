import { Injectable } from '@angular/core';
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service';
import { User } from '@platon/core/common';
import { Resource } from '@platon/feature/resource/common';


@Injectable({
  providedIn: 'root'
})
export class ResourcesTutorialService {
  constructor(
    private shepherdService: ShepherdService
  ) {}

  /**
   * Démarre le tutoriel complet de l'espace de travail
   */
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
            text: 'Commencer le tutoriel',
            action: () => this.shepherdService.next()
          },
          {
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel()
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
                this.shepherdService.next();
              } else {
                // Faire une recherche automatique d'exemple
                performSearch('python');
                setTimeout(() => this.shepherdService.next(), 1000);
              }
            }
          }
        ],
        when: {
          show: () => {
            // Mettre en évidence la barre de recherche
            const searchBar = document.querySelector('#tuto-resources-searchbar') as HTMLElement;
            if (searchBar) {
              searchBar.style.boxShadow = '0 0 0 3px rgba(24, 144, 255, 0.3)';
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

    // Si des résultats sont disponibles
    if (items.length > 0 || hasSearched()) {
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
          buttons: [
            {
              text: 'Compris !',
              action: () => this.shepherdService.next()
            }
          ]
        }
      );
    }

    // Ajouter les autres fonctionnalités
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
        text: 'Ce panneau affiche votre espace personnel et les ressources récemment consultées. Vous pouvez le réduire pour gagner de l\'espace.',
        attachTo: {
          element: '#tuto-resources-sidebar',
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
      // NOUVELLES ÉTAPES AJOUTÉES ICI
      {
        id: 'filter-button-intro',
        title: 'Utilisons les filtres avancés !',
        text: 'Maintenant que vous connaissez l\'interface, apprenons à filtrer précisément les résultats. Cliquez sur le bouton filtre dans la barre de recherche.',
        attachTo: {
          element: '#tuto_filter_list',//'[data-tutorial-target="filter-button"]',
          on: 'bottom'
        },
        advanceOn: {
          selector: '#tuto_filter_list',
          event: 'click'
        },
        buttons: [
          {
            text: 'Cliquer sur le bouton filtre',
            action: () => {
              const filterButton = document.querySelector('#tuto_filter_list') as HTMLElement;
              if (filterButton) {
                filterButton.click();
              }
              setTimeout(() => this.shepherdService.next(), 500);
            }
          }
        ],
        when: {
          show: () => {
            // Mettre en évidence le bouton filtre
            const filterButton = document.querySelector('#tuto_filter_list') as HTMLElement;
            if (filterButton) {
              filterButton.style.animation = 'pulseButton 2s ease-in-out infinite';
              filterButton.style.boxShadow = '0 0 0 3px rgba(24, 144, 255, 0.5)';
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
        id: 'filter-drawer-open',
        title: 'Panneau de recherche avancée',
        text: 'Voici le panneau de recherche avancée. Vous allez maintenant apprendre à filtrer par type de ressource. Cochez uniquement "Cercle" pour voir tous les cercles disponibles.',
        attachTo: {
          element: '.ant-drawer-content-wrapper',
          on: 'left'
        },
          when: {
            show: async () => {
              // Attendre que le drawer soit visible
              await this.waitForFilterDrawer();
              // Puis effacer automatiquement la recherche
              const searchInput = document.querySelector('ui-search-bar input[type="search"]') as HTMLInputElement;
              if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Recherche automatiquement effacée');
                performSearch(''); // Effacer la recherche
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
            text: 'Faire la sélection pour moi',
            action: () => {
              // Attendre un peu pour que le DOM soit prêt
              setTimeout(() => {
                // Sélectionner automatiquement Cercle et désélectionner les autres
                const checkboxes = document.querySelectorAll('#tuto-types-recourses mat-checkbox');
                console.log('Nombre de checkboxes trouvées:', checkboxes.length);

                checkboxes.forEach(checkbox => {
                  const formControlName = (checkbox as HTMLElement).getAttribute('formcontrolname') ||
                                         (checkbox as HTMLElement).getAttribute('formControlName') ||
                                         (checkbox as HTMLElement).getAttribute('ng-reflect-name');
                  console.log('FormControlName trouvé:', formControlName);

                  if (formControlName === 'CIRCLE') {
                    // Cocher Cercle s'il n'est pas déjà coché
                    if (!this.isCheckboxChecked(checkbox as HTMLElement)) {
                      const input = checkbox.querySelector('input[type="checkbox"]') as HTMLInputElement;
                      if (input) {
                        input.click();
                      } else {
                        (checkbox as HTMLElement).click();
                      }
                    }
                  } else if (formControlName) {
                    // Décocher les autres s'ils sont cochés
                    if (this.isCheckboxChecked(checkbox as HTMLElement)) {
                      const input = checkbox.querySelector('input[type="checkbox"]') as HTMLInputElement;
                      if (input) {
                        input.click();
                      } else {
                        (checkbox as HTMLElement).click();
                      }
                    }
                  }
                });

                // Avancer au bout de 500ms pour laisser le temps aux changements
                setTimeout(() => this.shepherdService.next(), 500);
              }, 100);
            }
          },
          {
            text: 'J\'ai coché "Cercle"',
            action: () => {
              // Attendre un peu pour s'assurer que le DOM est à jour
              setTimeout(() => {
                // Chercher toutes les checkboxes dans la section
                const typeSection = document.querySelector('#tuto-types-recourses');
                if (!typeSection) {
                  console.error('Section types non trouvée');
                  alert('Erreur: Section non trouvée. Veuillez réessayer.');
                  return;
                }

                const allCheckboxes = typeSection.querySelectorAll('mat-checkbox');
                console.log('Checkboxes trouvées:', allCheckboxes.length);

                let circleChecked = false;

                allCheckboxes.forEach(cb => {
                  const formControlName = (cb as HTMLElement).getAttribute('formcontrolname') ||
                                         (cb as HTMLElement).getAttribute('formControlName') ||
                                         (cb as HTMLElement).getAttribute('ng-reflect-name');
                  const isChecked = this.isCheckboxChecked(cb as HTMLElement);
                  console.log('Checkbox:', formControlName, 'Cochée:', isChecked);

                  if (formControlName === 'CIRCLE' && isChecked) {
                    circleChecked = true;
                  }
                });

                if (circleChecked) {
                  this.shepherdService.next();
                } else {
                  alert('Veuillez cocher la case "Cercle" pour continuer.');
                }
              }, 100);
            }
          }
        ],
        when: {
          show: () => {
            // Mettre en évidence la section types
            setTimeout(() => {
              const typeSection = document.querySelector('#tuto-types-recourses') as HTMLElement;
              if (typeSection) {
                typeSection.style.backgroundColor = 'rgba(24, 144, 255, 0.05)';
                typeSection.style.padding = '10px';
                typeSection.style.borderRadius = '8px';
                typeSection.style.border = '2px solid rgba(24, 144, 255, 0.3)';
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
        buttons: [],
        when: {
          show: () => {
            // Mettre en évidence le bouton Appliquer
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
        attachTo: {
          element: '#tuto-resources-list',
          on: 'top'
        },
        when: {
          show: () => {
            // Attendre que les résultats soient chargés
            setTimeout(() => {
              this.highlightCircles();
            }, 1000);
          }
        }
      },
      {
        id: 'click-circle',
        title: 'Explorez un cercle',
        text: 'Cliquez sur n\'importe quel cercle pour voir son contenu. Les cercles sont des espaces d\'organisation pour regrouper des ressources par thème ou objectif.',
        attachTo: {
          element: 'resource-item:first-child',
          on: 'bottom'
        },
        buttons: [
          {
            text: 'Compris, je vais explorer !',
            action: () => this.shepherdService.next()
          }
        ],
        when: {
          show: () => {
            // Ajouter un listener sur les cercles
            setTimeout(() => {
              const circles = document.querySelectorAll('resource-item');
              circles.forEach(circle => {
                circle.addEventListener('click', () => {
                  // Terminer le tutoriel quand l'utilisateur clique sur un cercle
                  setTimeout(() => this.shepherdService.complete(), 500);
                });
              });
            }, 500);
          }
        }
      },
      {
        id: 'tutorial-complete',
        title: 'Tutoriel terminé !',
        text: this.buildCompletionHTML(),
        buttons: [
          {
            text: 'Terminer',
            action: () => this.shepherdService.complete()
          }
        ]
      }
    );

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
        firstResource.style.boxShadow = '0 0 0 3px rgba(24, 144, 255, 0.3)';
        firstResource.style.borderRadius = '8px';

        // Nettoyer après le tutoriel
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
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <mat-icon style="color: #1890ff; margin-right: 12px;">▸</mat-icon>
            <div>
              <strong>Prévisualiser</strong>
              <p style="margin: 4px 0; font-size: 14px; color: #666;">
                Cliquez sur le titre ou l'icône prévisualiser pour voir le contenu de la ressource sans l'ouvrir en édition.
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <mat-icon style="color: #52c41a; margin-right: 12px;">✎</mat-icon>
            <div>
              <strong>Éditer</strong>
              <p style="margin: 4px 0; font-size: 14px; color: #666;">
                Cliquez sur le bouton crayon pour modifier la ressource (si vous en avez les droits).
              </p>
            </div>
          </div>
        </div>

        <div style="padding: 12px; background: #f0f2f5; border-radius: 8px; margin-top: 16px;">
          <p style="margin: 0; font-size: 14px;">
            <strong>💡 Astuce :</strong> Les actions disponibles dépendent de vos permissions sur chaque ressource.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Construit le HTML de fin de tutoriel
   */
  private buildCompletionHTML(): string {
    return `
      <div style="padding: 20px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
        <h3 style="margin-bottom: 16px; font-weight: 600;">Bravo ! Vous maîtrisez maintenant l'espace de travail.</h3>

        <div style="text-align: left; max-width: 400px; margin: 0 auto;">
          <p style="margin-bottom: 16px;">Vous savez maintenant :</p>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 8px;">✅ Rechercher des ressources efficacement</li>
            <li style="margin-bottom: 8px;">✅ Utiliser les filtres pour affiner vos recherches</li>
            <li style="margin-bottom: 8px;">✅ Prévisualiser et éditer des ressources</li>
            <li style="margin-bottom: 8px;">✅ Naviguer dans l'arbre des cercles</li>
            <li style="margin-bottom: 8px;">✅ Accéder à votre espace personnel</li>
            <li style="margin-bottom: 8px;">✅ Filtrer par type de ressource</li>
            <li style="margin-bottom: 8px;">✅ Explorer les cercles et leur contenu</li>
          </ul>
        </div>

        <div style="margin-top: 24px; padding: 16px; background: #e6f7ff; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Prochaine étape :</strong> Essayez de créer votre première ressource en utilisant le bouton "+" dans la barre d'outils !
          </p>
        </div>

        <p style="margin-top: 16px; font-size: 14px; color: #666;">
          Vous pouvez relancer ce tutoriel à tout moment en cliquant sur le bouton d'aide.
        </p>
      </div>
    `;
  }

  /**
   * Attend que le drawer de filtres soit ouvert
   */
  /**
 * Attend que le drawer de filtres soit ouvert et visible
 */
  private waitForFilterDrawer(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkDrawer = () => {
        const drawer = document.querySelector('.ant-drawer-content-wrapper');
        if (drawer && (drawer as HTMLElement).offsetWidth > 0) {
          // Le drawer est visible
          // Attendre un peu plus pour l'animation
          setTimeout(() => {
            resolve();
          }, 300);
        } else {
          // Continuer à vérifier toutes les 100ms
          setTimeout(checkDrawer, 100);
        }
      };

      // Commencer à vérifier
      checkDrawer();

      // Timeout de sécurité après 5 secondes
      setTimeout(() => {
        console.warn('Timeout waiting for filter drawer');
        resolve();
      }, 5000);
    });
  }

  /**
   * Vérifie si une checkbox est cochée
   */
  private isCheckboxChecked(checkbox: HTMLElement): boolean {
  // Chercher d'abord l'input
    const input = checkbox.querySelector('input[type="checkbox"]');
    if (input && (input as HTMLInputElement).checked) {
      return true;
    }

    // Autres moyens de vérifier (en fonction du framework)
    // Pour Angular Material
    const isCheckedClass = checkbox.classList.contains('mat-checkbox-checked') ||
                          checkbox.classList.contains('mat-mdc-checkbox-checked');
    if (isCheckedClass) {
      return true;
    }

    // Pour Ant Design
    const antChecked = checkbox.classList.contains('ant-checkbox-checked');
    if (antChecked) {
      return true;
    }

    // Vérifier l'attribut aria-checked
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
        element.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.2)';

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
   * Démarre un tutoriel pour les filtres
   */
  startFiltersTutorial(): void {
    const steps: TutorialStep[] = [
      {
        id: 'filters-intro',
        title: 'Filtres de recherche',
        text: 'Les filtres vous permettent d\'affiner précisément vos recherches pour trouver exactement ce dont vous avez besoin.',
      },
      {
        id: 'filter-types',
        title: 'Types de filtres',
        text: `
          <div>
            <p style="margin-bottom: 12px;"><strong>Filtres disponibles :</strong></p>
            <ul style="padding-left: 20px;">
              <li>Type de ressource (Exercice, Activité, Cercle, Cours)</li>
              <li>Statut (Brouillon, Publié, Obsolète)</li>
              <li>Niveau scolaire</li>
              <li>Matière/Topic</li>
              <li>Auteur</li>
              <li>Période de création</li>
            </ul>
          </div>
        `,
      },
      {
        id: 'filter-combination',
        title: 'Combiner les filtres',
        text: 'Vous pouvez combiner plusieurs filtres pour des recherches très précises. Les filtres actifs apparaissent sous la barre de recherche.',
      }
    ];

    this.shepherdService.startTutorial(steps, {
      tourName: 'filters-tutorial',
      useModalOverlay: true
    });
  }
}