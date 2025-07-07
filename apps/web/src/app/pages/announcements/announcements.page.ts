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

import { AuthService, DialogModule, DialogService } from '@platon/core/browser'
import { Announcement, AnnouncementFilters } from '@platon/feature/announcement/common'
import { AnnouncementService } from '@platon/feature/announcement/browser'
import { UiEditorJsModule, EditorjsViewerComponent } from '@platon/shared/ui'

import { OutputData } from '@editorjs/editorjs'

import { firstValueFrom } from 'rxjs'
import { NzCardModule } from 'ng-zorro-antd/card'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { UiLayoutTabDirective, UiLayoutTabsComponent } from '@platon/shared/ui'

import { NzSpaceComponent } from 'ng-zorro-antd/space'

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
    EditorjsViewerComponent,
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
    private readonly dialogService: DialogService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly announcementService: AnnouncementService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    void this.loadAnnouncements()
  }

  protected async loadAnnouncements(): Promise<void> {
    this.loading = true
    this.changeDetectorRef.markForCheck()

    try {
      // Utilisation de getVisibleForUser qui filtre selon le rôle de l'utilisateur
      const result = await firstValueFrom(this.announcementService.getVisibleForUser({ active: true }))
      this.announcements = result.resources
      this.filteredAnnouncements = [...this.announcements]

      if (!this.selectedAnnouncement && this.announcements.length > 0) {
        this.selectedAnnouncement = this.announcements[0]
      }
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error)
      this.dialogService.error('Erreur lors du chargement des annonces')
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
}
