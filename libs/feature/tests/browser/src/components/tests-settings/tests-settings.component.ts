import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { firstValueFrom } from 'rxjs'
// import { TestsService } from '../../api/tests.service'
import { MatIconModule } from '@angular/material/icon'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker'
import { Activity, Course } from '@platon/feature/course/common'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { CourseService } from '@platon/feature/course/browser'
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
import { MatCardModule } from '@angular/material/card'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatInputModule } from '@angular/material/input'
import { UiError403Component } from '@platon/shared/ui'
import { DialogService } from '@platon/core/browser'
import { Router } from '@angular/router'

@Component({
  standalone: true,
  selector: 'tests-settings',
  templateUrl: './tests-settings.component.html',
  styleUrls: ['./tests-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    UiError403Component,
    ReactiveFormsModule,

    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatFormFieldModule,

    NzDatePickerModule,
    NzModalModule,
    NzFormModule,
    NzSpinModule,
    NzButtonModule,
    NzSelectModule,
    NzInputModule,
    NzIconModule,
    NzPopconfirmModule,
  ],
})
export class TestsSettingsComponent implements OnInit {
  @Input() activity?: Activity

  @Output() activityChange = new EventEmitter<Activity>()

  @Input() course?: Course

  @Output() courseChange = new EventEmitter<Course>()

  protected startDate: Date | undefined
  protected endDate: Date | undefined

  protected savingDesc = false
  protected updating = false

  protected form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    desc: new FormControl('', [Validators.required]),
  })

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly courseService: CourseService,
    private readonly dialogService: DialogService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.course) {
      throw new Error('Course ID is required for Test Settings')
    }
    if (this.activity) {
      this.startDate = this.activity.openAt ?? undefined
      this.endDate = this.activity.closeAt ?? undefined
    }
    this.form = new FormGroup({
      name: new FormControl({ value: this.course.name, disabled: !this.canEdit }, [Validators.required]),
      desc: new FormControl({ value: this.course.desc || '', disabled: !this.canEdit }, [Validators.required]),
    })
    this.changeDetectorRef.markForCheck()
  }

  protected async onChangeData(): Promise<void> {
    if (this.activity) {
      await firstValueFrom(
        this.courseService.updateActivity(this.activity, {
          openAt: this.startDate,
          closeAt: this.endDate,
        })
      )
      this.activityChange.emit({ ...this.activity, openAt: this.startDate, closeAt: this.endDate })
    }
    this.changeDetectorRef.markForCheck()
  }

  protected disabledDateStart = (current: Date): boolean => differenceInCalendarDays(current, new Date()) < 0

  protected disabledDateEnd = (current: Date): boolean => {
    if (this.startDate) {
      return differenceInCalendarDays(current, new Date(this.startDate)) < 0
    }
    return differenceInCalendarDays(current, new Date()) < 0
  }

  protected get canEdit(): boolean {
    if (!this.course) return false
    return this.course.permissions?.update || false
  }

  protected get canSubmit(): boolean {
    return this.form.valid && this.canEdit
  }

  protected async saveChanges(): Promise<void> {
    if (!this.course) return
    this.savingDesc = true
    try {
      const { value } = this.form
      await firstValueFrom(
        this.courseService.update(this.course.id, { name: value.name as string, desc: value.desc as string })
      )
      this.course = { ...this.course, name: value.name as string, desc: value.desc as string }
      this.courseChange.emit(this.course)
    } finally {
      this.savingDesc = false
      this.changeDetectorRef.markForCheck()
    }
  }

  async deleteCourse() {
    if (!this.course) return
    try {
      await firstValueFrom(this.courseService.delete(this.course))
      this.dialogService.success('Le cours a bien été supprimé !')
      await this.router.navigate(['/tests'])
    } catch {
      this.dialogService.error('Une erreur est survenue lors de cette action, veuillez réessayer un peu plus tard !')
    }
  }

  protected async reload(): Promise<void> {
    if (!this.activity) return

    this.updating = true
    this.changeDetectorRef.markForCheck()

    try {
      const activity = await firstValueFrom(this.courseService.reloadActivity(this.activity))

      this.activityChange.emit((this.activity = activity))

      this.dialogService.success('Activité rechargée !')
    } catch {
      this.dialogService.error(
        "Une erreur est survenue lors du rechargement de l'activité, veuillez réessayer un peu plus tard !"
      )
    } finally {
      this.updating = false
      this.changeDetectorRef.markForCheck()
    }
  }
}
