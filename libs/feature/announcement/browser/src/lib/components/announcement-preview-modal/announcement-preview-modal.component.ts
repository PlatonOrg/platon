import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { UiEditorJsModule, EditorjsViewerComponent } from '@platon/shared/ui';
import { Announcement } from '@platon/feature/announcement/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'lib-announcement-preview-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzDividerModule,
    NzTagModule,
    UiEditorJsModule,
    EditorjsViewerComponent,
  ],
  templateUrl: './announcement-preview-modal.component.html',
  styleUrl: './announcement-preview-modal.component.scss',
})
export class AnnouncementPreviewModalComponent {

  private readonly dialogRef = inject(MatDialogRef<AnnouncementPreviewModalComponent>);
  private readonly data = inject(MAT_DIALOG_DATA);

  announcement = input<Announcement>(this.data.announcement);

  close(): void {
    this.dialogRef.close();
  }

  backToEdit(): void {
    this.dialogRef.close({ action: 'edit' });
  }

  getRoleColor(role: string): string {
    const colorMap: Record<string, string> = {
      admin: 'red',
      teacher: 'blue',
      student: 'green',
    };
    return colorMap[role] || 'default';
  }

  formatRoleName(role: string): string {
    const nameMap: Record<string, string> = {
      admin: 'Administrateur',
      teacher: 'Enseignant',
      student: 'Étudiant',
    };
    return nameMap[role] || role;
  }
}
