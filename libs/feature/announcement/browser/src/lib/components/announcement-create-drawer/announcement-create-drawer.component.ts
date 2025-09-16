import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  OnInit,
  Input,
  Output,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule as MatSelectModule_1 } from '@angular/material/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
 import { FormsModule } from '@angular/forms';
import { OutputData } from '@editorjs/editorjs';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';


import { DialogModule, DialogService } from '@platon/core/browser';
import { emptyEditorJsData, UiEditorJsModule } from '@platon/shared/ui'
import { Announcement, EditorOutputData, UpdateAnnouncementInput } from '@platon/feature/announcement/common'
import { UserRoles } from '@platon/core/common';

import { firstValueFrom } from 'rxjs';
import { NzRadioModule } from 'ng-zorro-antd/radio';

import { AnnouncementPreviewModalComponent } from '../announcement-preview-modal/announcement-preview-modal.component'
import { AnnouncementService } from '../../api/announcement.service'



@Component({
  selector: 'announcement-create-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule_1,
    MatDatepickerModule,
    NzFormModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzSpinModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzCheckboxModule,
    NzTagModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    NzIconModule,
    DialogModule,
    FormsModule,
    UiEditorJsModule,
    NzRadioModule,
  ],
  templateUrl: './announcement-create-drawer.component.html',
  styleUrl: './announcement-create-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AnnouncementCreateDrawerComponent implements OnInit {
  @Input() announcement?: Announcement
  @Output() created = new EventEmitter<Announcement>()
  @Output() updated = new EventEmitter<Announcement>()

  protected form!: FormGroup
  loading = false
  protected hasUnsavedChanges = false

  terms: OutputData = emptyEditorJsData()


  constructor(
    public dialogRef: MatDialogRef<AnnouncementCreateDrawerComponent>,
    private readonly fb: FormBuilder,
    private readonly announcementService: AnnouncementService,
    private readonly dialogService: DialogService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dialog : MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.createForm()
    this.announcement = this.data?.announcement || this.announcement

    if (this.announcement) {
      this.populateForm()
    }

    this.dialogRef.beforeClosed().subscribe(async () => {
      if (this.hasUnsavedChanges) {
      }
    })
  }

  private createForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      active: [true],
      icon: ['notification'],
      displayUntil: [null],
      displayDurationInDays: [undefined],
      targetAdmins: [false],
      targetTeachers: [false],
      targetStudents: [false],
      targetedRoles: this.fb.control([]),
    })

    this.form.valueChanges.subscribe(() => {
        this.hasUnsavedChanges = true
        this.changeDetectorRef.markForCheck()
    })
  }

  private populateForm(): void {
    if (!this.announcement) return

    this.form.patchValue({
      title: this.announcement.title,
      description: this.announcement.description,
      active: this.announcement.active,
      icon: this.announcement.icon || 'notification',
      displayUntil: this.announcement.displayUntil ? new Date(this.announcement.displayUntil) : null,
      displayDurationInDays: null,
      targetAdmins: this.announcement.targetedRoles?.includes('admin' as UserRoles),
      targetTeachers: this.announcement.targetedRoles?.includes('teacher' as UserRoles),
      targetStudents: this.announcement.targetedRoles?.includes('student' as UserRoles),
      targetedRoles: this.announcement.targetedRoles || [],
    })

    if (this.announcement.data) {
      this.terms = this.announcement.data
    }

    this.hasUnsavedChanges = false
  }


  previewAnnouncement(): void {
    this.updateTargetedRoles();

    const previewData: Announcement = {
      id: this.announcement?.id || 'preview',
      title: this.form.value.title || 'Titre de l\'annonce',
      description: this.form.value.description || 'Description de l\'annonce',
      active: this.form.value.active !== undefined ? this.form.value.active : true,
      icon: this.getIcon(this.form.value.icon || 'notification'),
      displayUntil: this.form.value.displayUntil,
      displayDurationInDays: this.form.value.displayDurationInDays,
      targetedRoles: this.form.value.targetedRoles || [],
      data: this.terms,
      createdAt: this.announcement?.createdAt || new Date(),
      updatedAt: this.announcement?.updatedAt || new  Date(),
    };

    const dialogRef = this.dialog.open(AnnouncementPreviewModalComponent, {
      width: '99%',
      height: '100%',
      disableClose: true,
      data: { announcement: previewData }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'edit') {
        // Pour l'instant on fait rien.
      }
    });
  }

  get dialogTitle(): string {
    return this.announcement ? "Modifier l'annonce" : 'Créer une annonce'
  }

  get submitButtonText(): string {
    return this.announcement ? 'Mettre à jour' : 'Créer'
  }



  protected updateTargetedRoles(): void {
    const targetedRoles: UserRoles[] = []
    if (this.form.get('targetAdmins')?.value) targetedRoles.push(UserRoles.admin)
    if (this.form.get('targetTeachers')?.value) targetedRoles.push(UserRoles.teacher)
    if (this.form.get('targetStudents')?.value) targetedRoles.push(UserRoles.student)
    this.form.get('targetedRoles')?.setValue(targetedRoles)
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

  async close(): Promise<void> {
    this.dialogRef.close()
  }

  protected onChangeData(data: OutputData): void {
    this.terms = data
    this.hasUnsavedChanges = true
    this.changeDetectorRef.markForCheck()
  }


  private getIcon(icon: string): string {
    switch (icon) {
      case 'Announcement':
        return 'announcement'
      default:
        return icon
    }
  }



  async save(): Promise<void> {
    this.loading = true;
    this.changeDetectorRef.markForCheck();

    try {
      this.updateTargetedRoles();

      const formData = {
        title: this.form.value.title,
        description: this.form.value.description,
        active: this.form.value.active,
        icon: this.getIcon(this.form.value.icon),
        displayUntil: this.form.value.displayUntil,
        displayDurationInDays: this.form.value.displayDurationInDays,
        targetedRoles: this.form.value.targetedRoles,
        data: this.terms as EditorOutputData,
      } as Announcement

      if (this.announcement) {
        const updatedAnnouncement = await firstValueFrom(
          this.announcementService.update(this.announcement.id, formData as UpdateAnnouncementInput)
        );

        this.dialogService.success('Annonce mise à jour avec succès');
        this.hasUnsavedChanges = false;
        this.updated.emit(updatedAnnouncement);
        this.dialogRef.close(updatedAnnouncement);
      } else {
        const newAnnouncement = await firstValueFrom(
          this.announcementService.create(formData)
        );

        if(newAnnouncement) {
          this.dialogService.success('Annonce créée avec succès');
          this.hasUnsavedChanges = false;
          this.created.emit(newAnnouncement);
          this.dialogRef.close(newAnnouncement);
        } else {
          this.dialogService.error('Erreur lors de la création de l\'annonce');
        }
      }
    } catch (error) {
      const action = this.announcement ? 'la mise à jour' : 'la création';
      this.dialogService.error(`Erreur lors de ${action} de l'annonce`);
    } finally {
      this.loading = false;
      this.changeDetectorRef.markForCheck();
    }
  }
}
