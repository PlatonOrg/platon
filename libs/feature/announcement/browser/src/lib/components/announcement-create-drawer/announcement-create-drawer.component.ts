import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, OnInit, Output, ViewChild } from '@angular/core';
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
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
 import { FormsModule } from '@angular/forms';
import { OutputData } from '@editorjs/editorjs';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';


import { DialogModule, DialogService } from '@platon/core/browser';
import { emptyEditorJsData, UiModalDrawerComponent, UiEditorJsModule } from '@platon/shared/ui'
import { Announcement } from '@platon/feature/announcement/browser';
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
  form!: FormGroup;
  loading = false;
  protected hasUnsavedChanges = false;
  readonly userRoles = Object.values(UserRoles); //['admin', 'teacher', 'student'];
  readonly iconOptions = [
    'notification',
    'bell',
    'info-circle',
    'exclamation-circle',
    'question-circle',
    'alert',
    'sound'
  ];

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
      targetedRoles: this.fb.control([]),
    });

    // Surveiller les changements du formulaire
    this.form.valueChanges.subscribe(() => {
      this.hasUnsavedChanges = true;
      this.changeDetectorRef.markForCheck();
    });
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
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
      return;
    }

    this.loading = true;
    this.changeDetectorRef.markForCheck();

    try {
      // Simuler la création pour le moment
      const mockAnnouncement: Announcement = {
        id: Date.now().toString(),
        ...this.form.value,
        createdAt: new Date()
      };

      // const announcement = await firstValueFrom(
      //   this.announcementService.create(this.form.value)
      // );

      this.dialogService.success('Annonce créée avec succès');
      this.hasUnsavedChanges = false;
      this.dialogRef.close(mockAnnouncement);
    } catch (error) {
      this.dialogService.error('Erreur lors de la création de l\'annonce');
    } finally {
      this.loading = false;
      this.changeDetectorRef.markForCheck();
    }
  }
}