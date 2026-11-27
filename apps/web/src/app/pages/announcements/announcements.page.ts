import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
} from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, RouterModule } from '@angular/router'

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
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { NzTypographyModule } from 'ng-zorro-antd/typography'

import { DialogModule, DialogService } from '@platon/core/browser'
import { Announcement } from '@platon/feature/announcement/common'
import { AnnouncementService } from '@platon/feature/announcement/browser'
import { UiEditorJsModule, EditorjsViewerComponent } from '@platon/shared/ui'

import { firstValueFrom } from 'rxjs'
import { NzCardModule } from 'ng-zorro-antd/card'
@Component({
  selector: 'app-announcements',
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
    NzTooltipModule,
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
  private readonly dialogService = inject(DialogService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly announcementService = inject(AnnouncementService)
  private readonly route = inject(ActivatedRoute)

  protected announcements: Announcement[] = []
  protected filteredAnnouncements: Announcement[] = []
  protected loading = true
  protected searchText = ''
  protected selectedAnnouncement: Announcement | null = null

  ngOnInit(): void {
    void this.loadAnnouncements()
  }

  protected async loadAnnouncements(): Promise<void> {
    this.loading = true
    this.changeDetectorRef.markForCheck()

    try {
      const result = await firstValueFrom(this.announcementService.getVisibleForUser({ active: true }))
      this.announcements = result.resources
      this.filteredAnnouncements = [...this.announcements]

      this.route.queryParams.subscribe(async (params) => {
        try {
          const highlightedId = params['highlight']

          if (highlightedId && this.announcements.length > 0) {
            try {
              this.selectedAnnouncement = await firstValueFrom(this.announcementService.findByIdForUser(highlightedId))
            } catch {
              this.selectedAnnouncement = await firstValueFrom(
                this.announcementService.findByIdForUser(this.announcements[0].id)
              )
            }
          } else if (this.announcements.length > 0) {
            this.selectedAnnouncement = await firstValueFrom(
              this.announcementService.findByIdForUser(this.announcements[0].id)
            )
          }
        } catch (_error) {
          this.dialogService.error("Erreur lors du chargement de l'annonce")
        } finally {
          this.changeDetectorRef.markForCheck()
        }
      })
    } catch (_error) {
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

  protected async selectAnnouncement(announcement: Announcement): Promise<void> {
    const selected = await firstValueFrom(this.announcementService.findByIdForUser(announcement.id))
    this.selectedAnnouncement = selected
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
}
