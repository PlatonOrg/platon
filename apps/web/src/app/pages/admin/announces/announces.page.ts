import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzTableModule } from 'ng-zorro-antd/table'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzCardModule } from 'ng-zorro-antd/card'

import { MatDialog, MatDialogModule } from '@angular/material/dialog'

import { UserRoles } from '@platon/core/common'

import { DialogModule, DialogService } from '@platon/core/browser'
import { Announcement } from '@platon/feature/announcement/common'
import {
  AnnouncementService,
  AnnouncementCreateDrawerComponent,
  AnnouncementPreviewModalComponent,
} from '@platon/feature/announcement/browser'
import { firstValueFrom } from 'rxjs'

@Component({
  standalone: true,
  selector: 'app-admin-announcements',
  templateUrl: './announces.page.html',
  styleUrls: ['./announces.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    MatIconModule,

    NzIconModule,
    NzButtonModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    NzModalModule,
    NzCardModule,

    MatDialogModule,

    DialogModule,
  ],
})
export class AdminAnnouncementsPage implements OnInit {
  protected announcements: Announcement[] = []
  protected loading = true

  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly modalService: NzModalService,
    private readonly dialogService: DialogService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    void this.loadAnnouncements()
  }

  protected openCreateDialog(): void {
    const dialogRef = this.dialog.open(AnnouncementCreateDrawerComponent, {
      width: '99%',
      height: '100%',
      disableClose: true,
    })

    dialogRef.afterClosed().subscribe((result: Announcement | undefined) => {
      if (result) {
        this.announcements = [result, ...this.announcements]
        this.changeDetectorRef.markForCheck()
      }
    })
  }

  protected openEditDialog(announcement: Announcement): void {
    const dialogRef = this.dialog.open(AnnouncementCreateDrawerComponent, {
      width: '99%',
      height: '100%',
      disableClose: true,
      data: { announcement },
    })

    dialogRef.afterClosed().subscribe((result: Announcement | undefined) => {
      if (result) {
        void this.updateAnnouncement(result)
      }
    })
  }

  protected openPreviewDialog(announcement: Announcement): void {
    const dialogRef = this.dialog.open(AnnouncementPreviewModalComponent, {
      width: '99%',
      height: '100%',
      disableClose: true,
      data: { announcement },
    })

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'edit') {
        this.openEditDialog(announcement)
      }
    })
  }

  protected limitedDescription(description: string, limit: number): string {
    return description.length > limit ? description.slice(0, limit) + '...' : description
  }

  async loadAnnouncements(): Promise<void> {
    this.loading = true
    this.changeDetectorRef.markForCheck()

    try {
      const announcements = await firstValueFrom(this.announcementService.search({}))

      this.announcements = announcements.resources
    } catch (error) {
      this.dialogService.error('Erreur lors du chargement des annonces')
    } finally {
      this.loading = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected updateAnnouncement(announcement: Announcement): void {
    this.announcements = this.announcements.map((item) => (item.id === announcement.id ? announcement : item))
    this.changeDetectorRef.markForCheck()
  }

  protected getRoleColor(role: string): string {
    const colorMap: Record<string, string> = {
      admin: 'red',
      teacher: 'blue',
      student: 'green',
    }

    return colorMap[role] || 'default'
  }

  protected formatRoleName(role: string): string {
    const nameMap: Record<string, string> = {
      admin: 'Administrateur',
      teacher: 'Enseignant',
      student: 'Étudiant',
    }

    return nameMap[role] || role
  }

  protected formatRolesList(roles: UserRoles[]): string {
    if (!roles?.length) return ''

    return roles.map((role) => this.formatRoleName(role)).join(', ')
  }

  protected async deleteAnnouncement(id: string): Promise<void> {
    const confirmed = await new Promise<boolean>((resolve) => {
      this.modalService.confirm({
        nzTitle: 'Êtes-vous sûr de vouloir supprimer cette annonce ?',
        nzContent: 'Cette action est irréversible.',
        nzOkText: 'Oui',
        nzOkType: 'primary',
        nzCancelText: 'Non',
        nzClosable: true,
        nzOnOk: () => resolve(true),
        nzOnCancel: () => resolve(false),
      })
    })

    if (confirmed) {
      try {
        await firstValueFrom(this.announcementService.delete(id))
        this.announcements = this.announcements.filter((item) => item.id !== id)
        this.changeDetectorRef.markForCheck()
        this.dialogService.success('Annonce supprimée avec succès')
      } catch (error) {
        this.dialogService.error("Erreur lors de la suppression de l'annonce")
      }
    }
  }

  protected toggleActive(announcement: Announcement): void {
    const newStatus = !announcement.active
    this.announcementService.update(announcement.id, { ...announcement, active: newStatus }).subscribe({
      next: (updated) => {
        this.updateAnnouncement(updated)
        this.dialogService.success(`Annonce ${newStatus ? 'activée' : 'désactivée'} avec succès`)
      },
      error: () => {
        this.dialogService.error(`Erreur lors ${newStatus ? "de l'activation" : 'de la désactivation'} de l'annonce`)
      },
    })
  }
}
