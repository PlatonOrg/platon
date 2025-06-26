import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core'
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
  //AnnouncementService,
  AnnouncementCreateDrawerComponent,
  AnnouncementEditDrawerComponent,
} from '@platon/feature/announcement/browser'
//import { AnnouncementCreateDrawerComponent } from '../../../components/announcement-create-drawer/announcement-create-drawer.component'
//import { AnnouncementEditDrawerComponent } from '../../../components/announcement-edit-drawer/announcement-edit-drawer.component'
import { firstValueFrom } from 'rxjs'

@Component({
  standalone: true,
  selector: 'app-admin-announcements',
  templateUrl: './announcements.page.html',
  styleUrls: ['./announcements.page.scss'],
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
    AnnouncementCreateDrawerComponent,
    AnnouncementEditDrawerComponent,
  ],
})
export class AdminAnnouncementsPage implements OnInit {
  protected announcements: Announcement[] = []
  protected loading = true

  constructor(
    //private readonly announcementService: AnnouncementService,
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
      width: '80%',
      height: '80%',
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
      width: '80%',
      height: '80%',
      disableClose: true,
      data: { announcement },
    })

    dialogRef.afterClosed().subscribe((result: Announcement | undefined) => {
      if (result) {
        // Mettre à jour l'annonce dans le tableau
        this.announcements = this.announcements.map((item) => (item.id === result.id ? result : item))
        this.changeDetectorRef.markForCheck()
      }
    })
  }

  async loadAnnouncements(): Promise<void> {
    this.announcements = [
      {
        id: '1',
        title: 'Nouvelle version de PLaTon disponible',
        description: 'Découvrez les nouvelles fonctionnalités de la version 2.0 de PLaTon',
        createdAt: new Date('2025-06-22T10:00:00'),
        updatedAt: new Date('2025-06-22T10:00:00'),
        active: true,
        displayUntil: new Date('2025-07-22T23:59:59'),
        displayDurationInDays: 30,
        targetedRoles: [UserRoles.teacher, UserRoles.admin],
        version: '2.0.0',
        icon: 'notification',
        data: {
          time: new Date().getTime(),
          blocks: [
            {
              type: 'header',
              data: {
                text: 'Bienvenue dans la version 2.0 de PLaTon !',
                level: 2,
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'Nous sommes ravis de vous présenter les nouvelles fonctionnalités de cette version majeure :',
              },
            },
            {
              type: 'list',
              data: {
                style: 'unordered',
                items: [
                  'Tutoriels interactifs pour les nouveaux utilisateurs',
                  'Interface améliorée pour la création de ressources',
                  "Nouveaux types d'exercices disponibles",
                  'Performance et stabilité améliorées',
                ],
              },
            },
            {
              type: 'paragraph',
              data: {
                text: "N'hésitez pas à explorer ces nouvelles fonctionnalités et à nous faire part de vos commentaires.",
              },
            },
          ],
          version: '2.3.12',
        },
        actions: [
          {
            label: 'Découvrir les tutoriels',
            url: '/tutorials',
          },
          {
            label: 'En savoir plus',
            url: '/documentation/v2',
          },
        ],
      },
    ]
    this.loading = false
    this.changeDetectorRef.markForCheck()
    // this.loading = true
    // this.changeDetectorRef.markForCheck()
    // try {
    //   const announcements = await firstValueFrom(
    //     this.announcementService.search(
    //       {
    //         limit: 100,
    //       },
    //       ['data']
    //     )
    //   )
    //   this.announcements = announcements
    // } catch (error) {
    //   this.dialogService.error('Erreur lors du chargement des annonces')
    // } finally {
    //   this.loading = false
    //   this.changeDetectorRef.markForCheck()
    // }
  }

  protected addAnnouncement(announcement: Announcement): void {
    //this.announcements = [announcement, ...this.announcements]
    this.changeDetectorRef.markForCheck()
  }

  protected updateAnnouncement(announcement: Announcement): void {
    // this.announcements = this.announcements.map((item) => (item.id === announcement.id ? announcement : item))
    this.changeDetectorRef.markForCheck()
  }

  // Dans votre composant announcements.page.ts
  protected getRoleColor(role: string): string {
    const colorMap: Record<string, string> = {
      admin: 'red',
      teacher: 'blue',
      student: 'green',
      // Ajoutez d'autres rôles selon votre système
    }

    return colorMap[role] || 'default'
  }

  protected formatRoleName(role: string): string {
    const nameMap: Record<string, string> = {
      admin: 'Administrateur',
      teacher: 'Enseignant',
      student: 'Étudiant',
      // Ajoutez d'autres rôles selon votre système
    }

    return nameMap[role] || role
  }

  protected formatRolesList(roles: UserRoles[]): string {
    if (!roles?.length) return ''

    return roles.map((role) => this.formatRoleName(role)).join(', ')
  }

  protected async deleteAnnouncement(id: string): Promise<void> {
    const confirmation = await firstValueFrom(
      this.modalService.confirm({
        nzTitle: 'Êtes-vous sûr de vouloir supprimer cette annonce ?',
        nzContent: 'Cette action est irréversible.',
        nzOkText: 'Oui',
        //nzOkType: 'danger',
        nzCancelText: 'Non',
      }).afterClose
    )

    if (confirmation) {
      try {
        //await firstValueFrom(this.announcementService.delete(id))
        //this.announcements = this.announcements.filter((item) => item.id !== id)
        this.changeDetectorRef.markForCheck()
        this.dialogService.success('Annonce supprimée avec succès')
      } catch (error) {
        this.dialogService.error("Erreur lors de la suppression de l'annonce")
      }
    }
  }

  protected toggleActive(announcement: Announcement): void {
    const newStatus = !announcement.active
    // this.announcementService
    //   .update(announcement.id, {
    //     active: newStatus,
    //   })
    //   .subscribe({
    //     next: (updated) => {
    //       this.updateAnnouncement(updated)
    //       this.dialogService.success(`Annonce ${newStatus ? 'activée' : 'désactivée'} avec succès`)
    //     },
    //     error: () => {
    //       this.dialogService.error(`Erreur lors ${newStatus ? "de l'activation" : 'de la désactivation'} de l'annonce`)
    //     },
    //   })
  }
}
