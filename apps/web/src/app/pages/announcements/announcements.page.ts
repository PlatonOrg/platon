import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'

import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatChipsModule } from '@angular/material/chips'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzDividerModule } from 'ng-zorro-antd/divider'
import { NzEmptyModule } from 'ng-zorro-antd/empty'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzTypographyModule } from 'ng-zorro-antd/typography'

import { DialogModule } from '@platon/core/browser'
import { Announcement, AnnouncementFilters } from '@platon/feature/announcement/common'
import { UiEditorJsModule } from '@platon/shared/ui'
import { OutputData } from '@editorjs/editorjs'

import { firstValueFrom } from 'rxjs'
import { NzCardModule } from 'ng-zorro-antd/card'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { UiLayoutTabDirective, UiLayoutTabsComponent } from '@platon/shared/ui'

import { UserRoles } from '@platon/core/common'

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,

    MatIconModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,

    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzEmptyModule,
    NzIconModule,
    NzInputModule,
    NzSkeletonModule,
    NzSpinModule,
    NzTagModule,
    NzToolTipModule,
    NzTypographyModule,

    DialogModule,
    UiEditorJsModule,
    UiLayoutTabDirective,
    UiLayoutTabsComponent,
  ],
  templateUrl: './announcements.page.html',
  styleUrl: './announcements.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AnnouncementsPage implements OnInit {
  protected announcements: Announcement[] = []
  protected filteredAnnouncements: Announcement[] = []
  protected loading = true
  protected searchText = ''
  protected selectedAnnouncement: Announcement | null = null

  constructor(
    private readonly dialogService: DialogModule,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    void this.loadAnnouncements()
  }

  protected async loadAnnouncements(): Promise<void> {
    this.loading = true
    this.changeDetectorRef.markForCheck()

    try {
      this.announcements = this.getDemoAnnouncements()
      this.filteredAnnouncements = [...this.announcements]

      if (!this.selectedAnnouncement && this.announcements.length > 0) {
        this.selectedAnnouncement = this.announcements[0]
      }
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error)
    } finally {
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected search(): void {
    if (!this.searchText.trim()) {
      this.filteredAnnouncements = [...this.announcements]
      return
    }

    const searchLower = this.searchText.toLowerCase()
    this.filteredAnnouncements = this.announcements.filter(
      (announcement) =>
        announcement.title.toLowerCase().includes(searchLower) ||
        announcement.description.toLowerCase().includes(searchLower)
    )

    this.changeDetectorRef.markForCheck()
  }

  /**
   * Solution 1: Forcer la recréation du Web Component à chaque changement
   * Cette méthode est plus radicale mais plus fiable
   */
  protected selectAnnouncement(announcement: Announcement): void {
    this.selectedAnnouncement = announcement
    this.changeDetectorRef.markForCheck()

    // Forcer la recréation du web component
    setTimeout(() => {
      this.recreateWebComponent()
    }, 100)
  }

  private recreateWebComponent(): void {
    // 1. D'abord, trouvons et supprimons l'ancien composant s'il existe
    const oldViewer = document.getElementById(this.editorId);
    if (oldViewer) {
      oldViewer.remove();
    }

    // 2. Créons un nouveau conteneur pour le script
    const scriptContainer = document.getElementById('script-container')
    if (scriptContainer) {
      scriptContainer.innerHTML = ''
      scriptContainer.innerHTML = this.scriptContent as string
    }

    // 3. Créons un nouveau web component
    const container = document.getElementById('viewer-container')
    if (container && this.selectedAnnouncement?.data) {
      // Créer un nouvel élément
      const newViewer = document.createElement('wc-editorjs-viewer')
      newViewer.id = this.editorId;

      // Ajouter l'élément au DOM
      container.appendChild(newViewer)
      // Donner le temps au composant de s'initialiser
      setTimeout(() => {
        // Assigner les données au nouveau composant
        const viewer = document.getElementById(this.editorId) as any
        if (viewer) {
          console.log('Setting data on new web component:', this.selectedAnnouncement?.data)

          // Essayer toutes les méthodes pour définir les données
          if (viewer.setAttribute) {
            viewer.setAttribute('data', JSON.stringify(this.selectedAnnouncement?.data))
          }

          if (viewer.data !== undefined) {
            viewer.data = this.selectedAnnouncement?.data
          }

          if (typeof viewer.updateData === 'function') {
            viewer.updateData(this.selectedAnnouncement?.data)
          }

          // Déclencher un événement personnalisé
          const event = new CustomEvent('dataChanged', {
            detail: this.selectedAnnouncement?.data
          })
          viewer.dispatchEvent(event)
        }
      }, 50)
    } else {
      console.warn('Container not found or no data available');
    }
  }

  /**
   * Solution 2: Alternative avec un attribut key pour forcer le rafraîchissement
   * Modifier le getter pour inclure un timestamp dans l'ID
   */
  get editorId(): string {
    // Ajouter un timestamp pour forcer le rafraîchissement du composant
    return 'editor-viewer-' + (this.selectedAnnouncement?.id || 'default') + '-' + Date.now();
  }

  protected formatRoleName(role: string): string {
    const nameMap: Record<string, string> = {
      admin: 'Administrateur',
      teacher: 'Enseignant',
      student: 'Étudiant',
    }

    return nameMap[role] || role
  }

  protected trackByFn(index: number, announcement: Announcement): string {
    return announcement.id
  }

  get scriptContent(): SafeHtml {
    // Correction de l'interpolation
    const scriptHtml = `<script type="application/json" id="${this.editorId}">
    ${JSON.stringify(this.selectedAnnouncement?.data || {})}
    </script>`
    return this.sanitizer.bypassSecurityTrustHtml(scriptHtml)
  }



  // Méthode pour créer des données de démonstration
  private getDemoAnnouncements(): Announcement[] {
    const now = new Date()

    return [
      {
        id: '1',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
        data: {
          time: 1750670742624,
          blocks: [
            {
              id: '1zvXF-15EM',
              data: { text: 'Bonjour {{ firstName }} {{ lastName }},' },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            { id: 'EPWDR1ymqv', data: {}, type: 'delimiter' },
            {
              id: 'INtCsB1GQ3',
              data: {
                text: 'Vous êtes invité à participer au test {{ testName }}. Veuillez cliquer sur le lien ci-dessous pour y accéder :',
              },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            {
              id: 'ttxEKjOvha',
              data: {
                html: '<p style="text-align: center;">\n<a href="{{ testLink }}" target="_blank" style="\n  display: inline-block;\n  padding: 8px 20px;\n  font-size: 16px;\n  font-weight: bold;\n  color: white;\n  background-color: #171C8F;\n  text-decoration: none;\n  border-radius: 6px;\n  border: none;\n  text-align: center;\n">\n  Passer le test\n</a>\n</p>',
              },
              type: 'raw',
            },
            { id: '-YXeiuLtYx', data: {}, type: 'delimiter' },
            {
              id: 'KcMVxVhLK6',
              data: {
                text: 'Le lien restera actif jusqu’au {{ endDate }}. Veillez à compléter le test en une seule session.',
              },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            {
              id: 'alhDDAuMWT',
              data: { text: 'N’hésitez pas à nous contacter si vous avez des questions.' },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            { id: 'ZWey3yUe94', data: {}, type: 'delimiter' },
            {
              id: 'fiwcVSw_WQ',
              data: { text: 'Bien cordialement,' },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            { id: 'NuT5SkGTz5', data: {}, type: 'delimiter' },
            {
              id: 'txgNSyAvgH',
              data: { text: '{{ currentFirstName }} {{ currentLastName }}<br>{{ currentEmail }}' },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
          ],
          version: '2.31.0-rc.7',
        },
      },
      {
        id: '2',
        title: 'Maintenance planifiée',
        description: 'La plateforme sera indisponible pour maintenance le 15 juin de 2h à 5h du matin',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 jours avant
        active: true,
        icon: 'warning',
        targetedRoles: [UserRoles.teacher, UserRoles.admin, UserRoles.student],
        data: {
          time: 1635603431944,
          blocks: [
            {
              type: 'header',
              data: {
                text: 'Maintenance planifiée',
                level: 2,
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Chers utilisateurs, nous avons planifié une maintenance pour le 15 juin de 2h à 5h du matin.',
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Durant cette période, la plateforme sera inaccessible. Nous vous prions de nous excuser pour ce désagrément.',
              },
            },
          ],
          version: '2.3.12',
        },
      },
      {
        id: '3',
        title: 'Nouveau cours disponible',
        description: "Un nouveau cours d'introduction à l'algorithmique est disponible",
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 jours avant
        active: true,
        icon: 'book',
        targetedRoles: [UserRoles.student],
        data: {
          time: 1750930393146,
          blocks: [
            {
              id: 'nPndLj1PoF',
              data: { text: 'Bienvenue sur le test {{ testName }}', level: 2 },
              type: 'header',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            {
              id: '6PQlnKNJLp',
              data: {
                items: [
                  { items: [], content: 'v' },
                  { items: [], content: 'zv' },
                  { items: [], content: 'dsv' },
                  { items: [], content: 'ds' },
                  { items: [], content: 'vs' },
                  { items: [], content: 'v' },
                  { items: [], content: '' },
                ],
                style: 'unordered',
              },
              type: 'list',
            },
            {
              id: '8pPVTO8v0Z',
              data: {
                text: "Vous êtes sur le point de commencer une épreuve individuelle d'une durée de {{ duration }}. Ce test est personnel et soumis à des règles strictes de surveillance automatique. Veuillez lire attentivement les consignes suivantes pour éviter tout blocage prématuré de votre session.",
              },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            {
              id: 'amG7xmkYs4',
              data: {
                items: [
                  { text: 'fv', checked: false },
                  { text: 'fzfe', checked: false },
                  { text: 'f', checked: false },
                  { text: 'z', checked: false },
                  { text: 'fez', checked: false },
                  { text: 'f', checked: false },
                  { text: 'zf', checked: false },
                  { text: 'ez', checked: false },
                  { text: 'f', checked: false },
                ],
              },
              type: 'checklist',
            },
            { id: 'dRZyD5hZVZ', data: {}, type: 'delimiter' },
            {
              id: 'ClAPP60eq7',
              data: { text: 'Règles importantes à respecter', level: 2 },
              type: 'header',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            {
              id: 'mzZZ-0oKIe',
              data: {
                items: [
                  {
                    items: [],
                    content:
                      "Restez dans cet onglet pendant toute la durée de l'épreuve. Passer à un autre onglet, réduire la fenêtre ou changer d'application entraînera l'arrêt immédiat du test.",
                  },
                  {
                    items: [],
                    content:
                      "Ne rechargez pas la page. Cela pourrait provoquer la perte de vos réponses et l'arrêt de la session.",
                  },
                  {
                    items: [],
                    content:
                      'Utilisez un ordinateur avec une connexion stable. Évitez de passer le test sur un téléphone ou une tablette.',
                  },
                  {
                    items: [],
                    content:
                      "Fermez les autres applications ou notifications susceptibles de vous distraire ou d'interférer avec la surveillance automatique.",
                  },
                ],
                style: 'unordered',
              },
              type: 'list',
            },
            { id: '7cM2xDoCN7', data: {}, type: 'delimiter' },
            {
              id: 'RblkzVEg89',
              data: { text: 'Conseils pour bien réussir', level: 2 },
              type: 'header',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            {
              id: 'tDexDUNXxP',
              data: {
                items: [
                  { items: [], content: 'Installez vous dans un environnement calme, sans interruption.-' },
                  { items: [], content: 'Assurez-vous que votre ordinateur est branché ou suffisamment chargé.' },
                  {
                    items: [],
                    content: 'Prenez quelques instants pour respirer et vous concentrer avant de commencer.',
                  },
                ],
                style: 'unordered',
              },
              type: 'list',
            },
            { id: 'rsEch8F3MC', data: {}, type: 'delimiter' },
            {
              id: 'U4yQFFelnd',
              data: { text: "Déclaration sur l'honneur", level: 2 },
              type: 'header',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
            {
              id: '7NVW7ChjX5',
              data: {
                text: "Je soussigné {{ lastName }} {{ firstName }}, atteste sur l’honneur que je passe le test suivant seul (sans aide), en personne (pas quelqu'un d'autre), et aujourd'hui {{ date }}. J'affirme avoir lu les règles ci-dessus. J'ai connaissance qu'un test de niveau me sera exigé en présentiel si mon dossier est accepté. Et qu'un échec à ce second test pourra invalider mon inscription si le résultat de celui ci est trop inférieur au présent test que je passe aujourd'hui. Que toute tentative de passer plusieurs fois le test dans une même session de sélection est éliminatoire. J’ai connaissance des sanctions pénales encourues par l’auteur en cas de fausse déclaration sur l’honneur.",
              },
              type: 'paragraph',
              tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
            },
          ],
          version: '2.31.0-rc.7',
        },
      },
      {
        id: '4',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '5',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '6',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '7',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '9',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '10',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '11',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '12',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '13',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '14',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '15',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '16',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '17',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '18',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      },
      {
        id: '19',
        title: 'Mise à jour de la plateforme PLaTon v2.3.12',
        description: 'Découvrez les nouvelles fonctionnalités de cette version majeure',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
        active: true,
        icon: 'notification',
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
      }

    ]
  }
}
