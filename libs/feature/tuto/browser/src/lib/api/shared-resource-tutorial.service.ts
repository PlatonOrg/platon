import { Injectable, inject } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { NzMessageService } from 'ng-zorro-antd/message'

@Injectable({ providedIn: 'root' })
export class SharedResourceTutorialService {
  private readonly message = inject(NzMessageService)
  constructor(private readonly shepherd: ShepherdService) {}

  startSharedResourceTutorial(): void {
    const steps = this.buildSteps()
    this.shepherd.startTutorial(steps, {
      tourName: 'shared-resources',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de partage ?',
    })
  }

  private buildSteps(): TutorialStep[] {
    return [
      // ─── Phase 1 : Bienvenue ───────────────────────────────────────────────
      {
        id: 'welcome',
        title: 'Partager un exercice hors de PLaTon',
        text: `<div style="text-align: center; padding: 20px;">
                <h3 style="color: var(--brand-text-primary); margin: 0 0 12px 0; font-weight: 600;">
                  Qu'allez-vous apprendre ?
                </h3>
                <p style="color: var(--brand-text-secondary); margin: 0 0 20px 0; line-height: 1.5;">
                  Ce tutoriel vous guide pour partager un exercice PLaTon avec des personnes
                  qui n'ont pas de compte sur la plateforme.
                </p>
                <div style="background: var(--brand-background-components);
                            border-radius: 8px; padding: 16px; margin: 16px 0;
                            border-left: 3px solid var(--brand-color-primary);">
                  <div style="text-align: left; color: var(--brand-text-primary); font-size: 14px; line-height: 1.8;">
                    Filtrer les ressources par type « Exercice »<br>
                    Accéder à la page d'un exercice<br>
                    Générer un lien de partage public<br>
                    Copier le lien ou le QR code
                  </div>
                </div>
                <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 16px 0 0 0;">
                  Durée : ~2 minutes &nbsp;|&nbsp; Interruptible à tout moment
                </p>
              </div>`,
        buttons: [
          { text: 'Passer', secondary: true, action: () => this.shepherd.cancel() },
          { text: 'Commencer', action: () => this.shepherd.next() },
        ],
      },

      // ─── Phase 2 : Filtrer par type Exercice ──────────────────────────────
      {
        id: 'open-filters',
        title: 'Ouvrir les filtres',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Pour trouver rapidement un exercice, nous allons
                 <strong style="color: var(--brand-text-primary);">filtrer les ressources par type</strong>.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez sur le bouton filtre dans la barre de recherche.
                 </p>
               </div>`,
        attachTo: { element: '#tuto_filter_list', on: 'bottom' },
        advanceOn: { selector: '#tuto_filter_list', event: 'click' },
        buttons: [{ text: 'Précédent', secondary: true, action: () => this.shepherd.previous() }],
        when: {
          show: () => {
            const btn = document.querySelector('#tuto_filter_list') as HTMLElement
            if (btn) {
              btn.style.animation = 'pulseButton 2s ease-in-out infinite'
              btn.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5)'
            }
          },
          hide: () => {
            const btn = document.querySelector('#tuto_filter_list') as HTMLElement
            if (btn) {
              btn.style.animation = ''
              btn.style.boxShadow = ''
            }
          },
        },
      },
      {
        id: 'select-exercise-type',
        title: 'Sélectionnez le type « Exercice »',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Dans la section <strong style="color: var(--brand-text-primary);">Types</strong>,
                 cochez uniquement la case <strong style="color: var(--brand-text-primary);">« Exercice »</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   Décochez les autres types s'ils sont déjà sélectionnés.
                 </small>
               </div>`,
        attachTo: { element: '#tuto-types-recourses', on: 'left' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          {
            text: "J'ai coché « Exercice »",
            action: () => {
              setTimeout(() => {
                const typeSection = document.querySelector('#tuto-types-recourses')
                if (!typeSection) {
                  this.shepherd.next()
                  return
                }
                const checkboxes = typeSection.querySelectorAll('mat-checkbox')
                const checked: string[] = []
                checkboxes.forEach((cb) => {
                  const input = cb.querySelector('input[type="checkbox"]') as HTMLInputElement | null
                  const isChecked = input ? input.checked : cb.getAttribute('aria-checked') === 'true'
                  if (isChecked) checked.push((cb as HTMLElement).textContent?.trim() ?? '')
                })
                const onlyExercise = checked.length === 1 && checked.some((l) => l.toLowerCase().includes('exercice'))
                if (onlyExercise) {
                  this.shepherd.next()
                } else {
                  this.message.warning('Veuillez cocher seulement la case « Exercice » pour continuer.')
                }
              }, 100)
            },
          },
        ],
        when: {
          show: () =>
            this.waitForFilterDrawer().then(() => {
              setTimeout(() => {
                const section = document.querySelector('#tuto-types-recourses') as HTMLElement
                if (section) {
                  section.style.backgroundColor = 'rgba(var(--brand-color-primary-rgb), 0.05)'
                  section.style.padding = '10px'
                  section.style.borderRadius = '8px'
                  section.style.border = '2px solid rgba(var(--brand-color-primary-rgb), 0.3)'
                }
              }, 300)
            }),
          hide: () => {
            const section = document.querySelector('#tuto-types-recourses') as HTMLElement
            if (section) {
              section.style.backgroundColor = ''
              section.style.padding = ''
              section.style.borderRadius = ''
              section.style.border = ''
            }
          },
        },
      },
      {
        id: 'apply-exercise-filter',
        title: 'Appliquer le filtre',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cliquez sur <strong style="color: var(--brand-text-primary);">Appliquer</strong>
                 pour afficher uniquement les exercices.
               </p>`,
        attachTo: { element: '#tuto-apply-filters', on: 'top' },
        advanceOn: { selector: '#tuto-apply-filters', event: 'click' },
        buttons: [{ text: 'Précédent', secondary: true, action: () => this.shepherd.previous() }],
        when: {
          show: () => {
            const btn = document.querySelector('#tuto-apply-filters') as HTMLElement
            if (btn) btn.style.animation = 'pulseButton 2s ease-in-out infinite'
          },
          hide: () => {
            const btn = document.querySelector('#tuto-apply-filters') as HTMLElement
            if (btn) btn.style.animation = ''
          },
        },
      },
      {
        id: 'exercises-list',
        title: 'Voici vos exercices',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 La liste affiche maintenant uniquement vos
                 <strong style="color: var(--brand-text-primary);">exercices</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Dans l'étape suivante, vous allez ouvrir l'un de ces exercices.
                 </small>
               </div>`,
        when: {
          show: () => {
            setTimeout(() => this.highlightExercises(), 800)
          },
        },
        buttons: [{ text: 'Suivant', action: () => this.shepherd.next() }],
      },
      {
        id: 'click-exercise',
        title: 'Ouvrez un exercice',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cliquez sur le <strong style="color: var(--brand-text-primary);">titre</strong>
                 du premier exercice de la liste pour accéder à sa page.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez maintenant sur le titre du premier exercice.
                 </p>
               </div>`,
        attachTo: { element: '#tuto-title-resource', on: 'bottom' },
        advanceOn: { selector: '#tuto-title-resource', event: 'click' },
        buttons: [{ text: 'Précédent', secondary: true, action: () => this.shepherd.previous() }],
        when: {
          show: () => {
            const title = document.querySelector('#tuto-title-resource') as HTMLElement
            if (title) {
              title.style.transition = 'all 0.3s ease'
              title.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.3)'
              title.style.borderRadius = '4px'
            }
          },
          hide: () => {
            const title = document.querySelector('#tuto-title-resource') as HTMLElement
            if (title) {
              title.style.boxShadow = ''
              title.style.borderRadius = ''
            }
          },
        },
      },

      {
        id: 'exercise-page-loaded',
        title: "Vous êtes sur la page de l'exercice",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Vous accédez maintenant à la page de détail de l'exercice.
                 C'est depuis cette page que vous pouvez le
                 <strong style="color: var(--brand-text-primary);">partager avec l'extérieur</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Cliquez sur Suivant dès que la page est chargée.
                 </small>
               </div>`,
        buttons: [{ text: 'Suivant', action: () => this.shepherd.next() }],
      },
      {
        id: 'share-button',
        title: 'Le bouton Partager',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce bouton ouvre le
                 <strong style="color: var(--brand-text-primary);">panneau de partage</strong>.
                 Il vous permet de générer un lien ou un QR code pour partager l'exercice
                 avec des personnes sans compte PLaTon.
               </p>`,
        attachTo: { element: '#tuto-share-button', on: 'bottom' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
      },
      {
        id: 'open-share-panel',
        title: 'Ouvrez le panneau de partage',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 <strong style="color: var(--brand-text-primary);">Cliquez sur Partager</strong>
                 pour ouvrir le panneau et configurer le partage de votre exercice.
               </p>
               <div style="background: rgba(var(--brand-color-primary-rgb), 0.05); border-radius: 8px;
                           padding: 12px; border: 2px solid rgba(var(--brand-color-primary-rgb), 0.3);">
                 <p style="margin: 0; font-size: 13px; color: var(--brand-text-primary);">
                   Cliquez maintenant sur le bouton Partager.
                 </p>
               </div>`,
        attachTo: { element: '#tuto-share-button', on: 'bottom' },
        advanceOn: { selector: '#tuto-share-button', event: 'click' },
        buttons: [{ text: 'Précédent', secondary: true, action: () => this.shepherd.previous() }],
        when: {
          show: () => {
            const btn = document.querySelector('#tuto-share-button') as HTMLElement
            if (btn) {
              btn.style.animation = 'pulseButton 2s ease-in-out infinite'
              btn.style.boxShadow = '0 0 0 3px rgba(var(--brand-color-primary-rgb), 0.5)'
            }
          },
          hide: () => {
            const btn = document.querySelector('#tuto-share-button') as HTMLElement
            if (btn) {
              btn.style.animation = ''
              btn.style.boxShadow = ''
            }
          },
        },
      },

      // ─── Phase 4 : Panneau de partage ─────────────────────────────────────
      {
        id: 'sharing-visibility',
        title: "Visibilité de l'exercice",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce sélecteur contrôle
                 <strong style="color: var(--brand-text-primary);">qui peut accéder à l'exercice</strong>.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 10px;">
                   <strong style="color: var(--brand-text-primary); font-size: 13px;">Visible en dehors de PLaTon</strong><br>
                   <small style="color: var(--brand-text-secondary);">N'importe qui avec le lien peut jouer l'exercice, sans compte PLaTon</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 10px;">
                   <strong style="color: var(--brand-text-primary); font-size: 13px;">Visible uniquement dans PLaTon</strong><br>
                   <small style="color: var(--brand-text-secondary);">L'exercice reste accessible aux seuls utilisateurs de la plateforme</small>
                 </div>
               </div>`,
        attachTo: { element: '#tuto-sharing-visibility-select', on: 'left' },
        buttons: [
          { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
          { text: 'Suivant', action: () => this.shepherd.next() },
        ],
        when: {
          show: () => this.waitForSharingPanel(),
        },
      },
      // {
      //   id: 'sharing-qrcode',
      //   title: 'QR code de partage',
      //   text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
      //            Ce QR code pointe directement vers l'exercice.
      //            <strong style="color: var(--brand-text-primary);">Photographiez-le</strong> ou
      //            imprimez-le pour le distribuer à vos étudiants lors d'une séance en présentiel.
      //          </p>
      //          <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
      //                      border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
      //            <small style="color: var(--brand-text-secondary);">
      //              Le QR code se met à jour automatiquement si vous changez la version de l'exercice.
      //            </small>
      //          </div>`,
      //   attachTo: { element: '#tuto-sharing-qrcode', on: 'left' },
      //   buttons: [
      //     { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
      //     { text: 'Suivant', action: () => this.shepherd.next() },
      //   ],
      // },
      // {
      //   id: 'sharing-version',
      //   title: 'Choisir la version à partager',
      //   text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
      //            Ce sélecteur détermine quelle
      //            <strong style="color: var(--brand-text-primary);">version de l'exercice</strong>
      //            sera accessible via le lien partagé.
      //          </p>
      //          <div style="display: flex; flex-direction: column; gap: 6px;">
      //            <div style="background: var(--brand-background-components); border-radius: 6px; padding: 10px;">
      //              <strong style="color: var(--brand-text-primary); font-size: 13px;">latest</strong><br>
      //              <small style="color: var(--brand-text-secondary);">Toujours la version la plus récente (recommandé)</small>
      //            </div>
      //            <div style="background: var(--brand-background-components); border-radius: 6px; padding: 10px;">
      //              <strong style="color: var(--brand-text-primary); font-size: 13px;">Version spécifique</strong><br>
      //              <small style="color: var(--brand-text-secondary);">Fixe l'exercice à un état donné, même si vous le modifiez par la suite</small>
      //            </div>
      //          </div>`,
      //   attachTo: { element: '#tuto-sharing-version-select', on: 'left' },
      //   buttons: [
      //     { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
      //     { text: 'Suivant', action: () => this.shepherd.next() },
      //   ],
      // },
      // {
      //   id: 'sharing-copy-link',
      //   title: 'Copier le lien de partage',
      //   text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
      //            Ce bouton copie le <strong style="color: var(--brand-text-primary);">lien direct</strong>
      //            vers l'exercice dans votre presse-papiers.
      //          </p>
      //          <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
      //                      border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
      //            <small style="color: var(--brand-text-secondary);">
      //              Collez ensuite ce lien dans un e-mail, un ENT ou tout autre canal pour le distribuer à vos étudiants.
      //            </small>
      //          </div>`,
      //   attachTo: { element: '#tuto-sharing-copy-link-btn', on: 'left' },
      //   buttons: [
      //     { text: 'Précédent', secondary: true, action: () => this.shepherd.previous() },
      //     { text: 'Suivant', action: () => this.shepherd.next() },
      //   ],
      // },

      // ─── Phase 5 : Fin ────────────────────────────────────────────────────
      {
        id: 'finish',
        title: 'Tutoriel terminé',
        text: `<div style="text-align: center; padding: 20px;">
                 <h3 style="color: var(--brand-text-primary); margin: 0 0 16px 0;">
                   Vous savez partager un exercice hors de PLaTon !
                 </h3>
                 <div style="background: var(--brand-background-components); border-radius: 8px;
                             padding: 16px; margin: 16px 0;
                             border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                   <div style="text-align: left; color: var(--brand-text-secondary); line-height: 1.8;">
                     Filtrer les ressources par type « Exercice »<br>
                     Accéder à la page d'un exercice<br>
                     Configurer la visibilité publique<br>
                     Partager via lien ou QR code
                   </div>
                 </div>
                 <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 0;">
                   Vous pouvez relancer ce tutoriel à tout moment depuis le menu d'aide.
                 </p>
               </div>`,
        buttons: [{ text: 'Terminer', action: () => this.shepherd.complete() }],
      },
    ]
  }

  private highlightExercises(): void {
    const items = document.querySelectorAll('#tuto-resources-list resource-item')
    items.forEach((item, index) => {
      const el = item as HTMLElement
      setTimeout(() => {
        el.style.transition = 'all 0.3s ease'
        el.style.transform = 'translateX(5px)'
        el.style.boxShadow = '0 2px 8px rgba(var(--brand-color-primary-rgb), 0.2)'
        setTimeout(() => {
          el.style.transform = ''
        }, 300)
      }, index * 100)
    })
  }

  private waitForFilterDrawer(): Promise<void> {
    return new Promise<void>((resolve) => {
      const check = () => {
        const drawer = document.querySelector('#tuto-recherche-avancee')
        if (drawer && (drawer as HTMLElement).offsetWidth > 0) {
          setTimeout(resolve, 300)
        } else {
          setTimeout(check, 100)
        }
      }
      check()
      setTimeout(resolve, 3000)
    })
  }

  private waitForSharingPanel(): void {
    const check = () => {
      const panel = document.querySelector('#tuto-sharing-visibility-select')
      if (!panel) setTimeout(check, 100)
    }
    check()
  }
}
