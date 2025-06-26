import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, OnInit, Input, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
 import { FormsModule } from '@angular/forms';
import { OutputData } from '@editorjs/editorjs';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';


import { DialogModule, DialogService } from '@platon/core/browser';
import { emptyEditorJsData, UiModalDrawerComponent, UiEditorJsModule } from '@platon/shared/ui'
import { Announcement } from '@platon/feature/announcement/common';
import { UserRoles } from '@platon/core/common';

//import { AnnouncementService } from '@platon/feature/announcement/browser';
import { firstValueFrom } from 'rxjs';
import { empty } from '@apollo/client/core';

@Component({
  selector: 'announcement-create-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
    UiModalDrawerComponent,
    UiEditorJsModule
],
  templateUrl: './announcement-create-drawer.component.html',
  styleUrl: './announcement-create-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementCreateDrawerComponent implements OnInit {

  @Input() announcement?: Announcement; // Ajoutez cette propriété pour l'édition
  @Output() created = new EventEmitter<Announcement>(); // Pour la création
  @Output() updated = new EventEmitter<Announcement>(); // Pour l'édition

  form!: FormGroup;
  loading = false;
  protected hasUnsavedChanges = false;
  readonly userRoles = Object.values(UserRoles); //['admin', 'teacher', 'student'];


  terms: OutputData = emptyEditorJsData();

  constructor(
    public dialogRef: MatDialogRef<AnnouncementCreateDrawerComponent>, // AnnouncementCreateModalComponent
    private readonly fb: FormBuilder,
    //private readonly announcementService: AnnouncementService,
    private readonly dialogService: DialogService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.announcement = this.data?.announcement || this.announcement;
    if (this.announcement) {
      this.populateForm();
    }

    this.dialogRef.beforeClosed().subscribe(async () => {
      if (this.hasUnsavedChanges) {
        // Optionnel: demander confirmation avant fermeture si des changements non sauvegardés
      }
    });
  }


  private createForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      active: [true],
      displayUntil: [null],
      displayDurationInDays: [null],
      targetAdmins: [false],
      targetTeachers: [false],
      targetStudents: [false],
      targetedRoles: this.fb.control([]),
    });

    // Surveiller les changements du formulaire
    this.form.valueChanges.subscribe(() => {
      this.hasUnsavedChanges = true;
      this.changeDetectorRef.markForCheck();
    });
  }

  private populateForm(): void {
    if (!this.announcement) return;

    // Pré-remplir le formulaire avec les données de l'annonce existante
    this.form.patchValue({
      title: this.announcement.title,
      description: this.announcement.description,
      active: this.announcement.active,
      displayUntil: this.announcement.displayUntil ? new Date(this.announcement.displayUntil) : null,
      displayDurationInDays: this.announcement.displayDurationInDays,
      targetAdmins: this.announcement.targetedRoles?.includes('admin' as UserRoles),
      targetTeachers: this.announcement.targetedRoles?.includes('teacher' as UserRoles),
      targetStudents: this.announcement.targetedRoles?.includes('student' as UserRoles),
      targetedRoles: this.announcement.targetedRoles || [],
    });

    // Initialiser le contenu de l'éditeur
    if (this.announcement.data) {
      this.terms = this.announcement.data;
    }

    // Indiquer qu'il n'y a pas encore de changements non sauvegardés
    this.hasUnsavedChanges = false;
  }

  get dialogTitle(): string {
    return this.announcement ? 'Modifier l\'annonce' : 'Créer une annonce';
  }

  // Texte du bouton de soumission
  get submitButtonText(): string {
    return this.announcement ? 'Mettre à jour' : 'Créer';
  }

  protected updateTargetedRoles(): void {
    const targetedRoles: UserRoles[] = [];

    if (this.form.get('targetAdmins')?.value) {
      targetedRoles.push('admin' as UserRoles);
    }

    if (this.form.get('targetTeachers')?.value) {
      targetedRoles.push('teacher' as UserRoles);
    }

    if (this.form.get('targetStudents')?.value) {
      targetedRoles.push('student' as UserRoles);
    }

    // Mettre à jour le champ caché targetedRoles
    this.form.get('targetedRoles')?.setValue(targetedRoles);
  }

  // Ces méthodes sont utilisées pour formater et colorer les tags de rôles
  protected getRoleColor(role: string): string {
    const colorMap: Record<string, string> = {
      'admin': 'red',
      'teacher': 'blue',
      'student': 'green'
    };

    return colorMap[role] || 'default';
  }

  protected formatRoleName(role: string): string {
    const nameMap: Record<string, string> = {
      'admin': 'Administrateur',
      'teacher': 'Enseignant',
      'student': 'Étudiant'
    };

    return nameMap[role] || role;
  }

  async close(): Promise<void> {
    this.dialogRef.close();
  }

  protected onChangeData(data: OutputData): void {
    this.terms = data
    this.hasUnsavedChanges = true
    this.changeDetectorRef.markForCheck()
  }

  async save(): Promise<void> {
    // Vérification de validité du formulaire identique

    this.loading = true;
    this.changeDetectorRef.markForCheck();

    try {
      const formData = {
        ...this.form.value,
        data: this.terms
      };

      if (this.announcement) {
        // Mode édition
        // Simuler la mise à jour pour le moment
        const updatedAnnouncement: Announcement = {
          ...this.announcement,
          ...formData,
          updatedAt: new Date()
        };

        // const updatedAnnouncement = await firstValueFrom(
        //   this.announcementService.update(this.announcement.id, formData)
        // );

        this.dialogService.success('Annonce mise à jour avec succès');
        this.hasUnsavedChanges = false;
        this.updated.emit(updatedAnnouncement);
        this.dialogRef.close(updatedAnnouncement);
      } else {
        // Mode création (code existant)
        const newAnnouncement: Announcement = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date()
        };

        // const newAnnouncement = await firstValueFrom(
        //   this.announcementService.create(formData)
        // );

        this.dialogService.success('Annonce créée avec succès');
        this.hasUnsavedChanges = false;
        this.created.emit(newAnnouncement);
        this.dialogRef.close(newAnnouncement);
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