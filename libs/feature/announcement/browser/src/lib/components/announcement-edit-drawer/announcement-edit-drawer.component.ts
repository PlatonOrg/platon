import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
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


import { DialogModule, DialogService } from '@platon/core/browser';
import { UiModalDrawerComponent } from '@platon/shared/ui'

import { Announcement } from '@platon/feature/announcement/browser';
//import { AnnouncementService } from '@platon/feature/announcement/browser';
import { EditorJsComponent } from '@platon/shared/ui';
import { firstValueFrom } from 'rxjs';


@Component({
  selector: 'announcement-edit-drawer',
  standalone: true,
  imports: [CommonModule,
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
    NzIconModule,

    DialogModule,
    UiModalDrawerComponent,
  ],
  templateUrl: './announcement-edit-drawer.component.html',
  styleUrl: './announcement-edit-drawer.component.scss',
})
export class AnnouncementEditDrawerComponent {
  @Output() updated = new EventEmitter<Announcement>();

  form!: FormGroup;
  loading = false;
  currentAnnouncement?: Announcement;

  readonly userRoles = ['admin', 'teacher', 'student'];
  readonly iconOptions = ['info-circle', 'notification', 'bell', 'exclamation-circle', 'announcement', 'warning'];

  constructor(
    private readonly fb: FormBuilder,
    //private readonly announcementService: AnnouncementService,
    private readonly dialogService: DialogService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.createForm();
  }

  private createForm(announcement?: Announcement): void {
    this.form = this.fb.group({
      title: [announcement?.title || '', [Validators.required]],
      description: [announcement?.description || '', [Validators.required]],
      active: [announcement?.active !== undefined ? announcement.active : true],
      displayUntil: [announcement?.displayUntil ? new Date(announcement.displayUntil) : null],
      displayDurationInDays: [announcement?.displayDurationInDays || null],
      targetedRoles: [announcement?.targetedRoles || []],
      icon: [announcement?.icon || 'info-circle'],
      data: [announcement?.data || null],
    });
  }

  open(announcement: Announcement): void {
    this.currentAnnouncement = announcement;
    this.createForm(announcement);
    this.changeDetectorRef.markForCheck();
  }

  async save(drawer: UiModalDrawerComponent): Promise<void> {
    if (!this.currentAnnouncement) {
      return;
    }

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
      // const updatedAnnouncement = await firstValueFrom(
      //   this.announcementService.update(this.currentAnnouncement.id, this.form.value)
      // );

      // this.updated.emit(updatedAnnouncement);
      this.dialogService.success('Annonce mise à jour avec succès');
      drawer.close();
    } catch (error) {
      this.dialogService.error('Erreur lors de la mise à jour de l\'annonce');
    } finally {
      this.loading = false;
      this.changeDetectorRef.markForCheck();
    }
  }
}
