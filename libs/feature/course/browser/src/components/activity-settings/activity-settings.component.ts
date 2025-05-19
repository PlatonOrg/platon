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
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
//import { saveAs } from 'file-saver'

import { MatIconModule } from '@angular/material/icon'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker'
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzCardModule } from 'ng-zorro-antd/card'

import { DialogModule, DialogService } from '@platon/core/browser'
import {
  Activity,
  CourseGroup,
  CourseMember,
  Restriction,
  RestrictionConfig,
  RestrictionList,
} from '@platon/feature/course/common'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { firstValueFrom } from 'rxjs'
import { CourseService } from '../../api/course.service'
import { PropositionsComponent } from './propositions/propositions.component'
import { RestrictionManagerComponent } from './restriction-manager/restriction-manager.component'

@Component({
  standalone: true,
  selector: 'course-activity-settings',
  templateUrl: './activity-settings.component.html',
  styleUrls: ['./activity-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    NzSpinModule,
    NzButtonModule,
    NzSkeletonModule,
    NzDatePickerModule,
    NzPopconfirmModule,
    DialogModule,
    NzCardModule,
    PropositionsComponent,
    RestrictionManagerComponent,
  ],
})
export class CourseActivitySettingsComponent implements OnInit {
  @Input() activity!: Activity
  @Output() activityChange = new EventEmitter<Activity>()
  restrictions: RestrictionList[] = [] as RestrictionList[]
  @Output() changeRestriction = false

  protected form = new FormGroup({
    openAt: new FormControl<Date | undefined>(undefined),
    closeAt: new FormControl<Date | undefined>(undefined),
    members: new FormControl<string[] | undefined>(undefined),
    correctors: new FormControl<string[] | undefined>(undefined),
    groups: new FormControl<string[] | undefined>(undefined),
  })

  protected loading = false
  protected updating = false
  protected courseMembers: CourseMember[] = []
  protected courseGroups: CourseGroup[] = []

  protected disabledDate = (current: Date): boolean => differenceInCalendarDays(current, new Date()) < 0

  constructor(
    private readonly courseService: CourseService,
    private readonly dialogService: DialogService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true

    const course = await firstValueFrom(
      this.courseService.find({
        id: this.activity.courseId,
      })
    )

    const [courseMembers, activityMembers, activityCorrectors, courseGroups, activityGroups] = await Promise.all([
      firstValueFrom(this.courseService.searchMembers(course)),
      firstValueFrom(this.courseService.searchActivityMembers(this.activity)),
      firstValueFrom(this.courseService.searchActivityCorrector(this.activity)),
      firstValueFrom(this.courseService.listGroups(course.id)),
      firstValueFrom(this.courseService.searchActivityGroups(this.activity.id)),
    ])

    this.courseMembers = courseMembers.resources
    this.courseGroups = courseGroups.resources

    this.form.patchValue({
      openAt: this.activity.openAt,
      closeAt: this.activity.closeAt,
      members: activityMembers.resources.map((m) => `${m.member.id}${m.user ? ':' + m.user.id : ''}`),
      correctors: activityCorrectors.resources.map((c) => `${c.member.id}${c.user ? ':' + c.user.id : ''}`),
      groups: activityGroups.resources.map((g) => g.groupId),
    })

    if (this.activity.restrictions && this.activity?.restrictions.length > 0) {
      console.log('Restrictions from activité : \n\n', this.activity.restrictions)
      this.restrictions = [...this.activity.restrictions]
    } else {
      const startAt = this.form.get('openAt')?.value
      const closeAt = this.form.get('closeAt')?.value
      this.newRestriction()
      const isDateRange = (
        config: RestrictionConfig[keyof RestrictionConfig]
      ): config is RestrictionConfig['DateRange'] => {
        return config !== undefined || 'start' in config || 'end' in config
      }
      if (isDateRange(this.restrictions[0].restriction[0].config)) {
        this.restrictions[0].restriction[0].config.start = startAt instanceof Date ? startAt : undefined
        this.restrictions[0].restriction[0].config.end = closeAt instanceof Date ? closeAt : undefined
      }
    }

    // Vérifier si une restriction de type 'DateRange' existe déjà
    /*const dateRangeIndex = this.restrictions.findIndex((restriction) => restriction.type === 'DateRange')

    if (dateRangeIndex === -1) {
      this.restrictions.unshift({
        type: 'DateRange',
        config: {
          start: startAt instanceof Date ? startAt : undefined,
          end: closeAt instanceof Date ? closeAt : undefined,
        },
      })
    }
    if (!this.restrictions.some((restriction) => restriction.type === 'Members')) {
      this.restrictions.push({
        type: 'Members',
        config: {
          members: this.form.get('members')?.value || undefined,
        },
      })
    }

    if (!this.restrictions.some((restriction) => restriction.type === 'Groups')) {
      this.restrictions.push({
        type: 'Groups',
        config: {
          groups: this.form.get('groups')?.value || undefined,
        },
      })
    }

    if (!this.restrictions.some((restriction) => restriction.type === 'Correctors')) {
      this.restrictions.push({
        type: 'Correctors',
        config: {
          correctors: this.form.get('correctors')?.value || undefined,
        },
      })
    }*/

    console.log('Restrictions testings \n\n :', this.restrictions)
    this.addRest = true

    this.loading = false
    this.changeDetectorRef.markForCheck()
  }

  isOpen = true
  addRest = false
  isOpenProposition = false
  selectedType = ''
  jeuDeRestriction = false

  accordDeroule() {
    this.isOpen = !this.isOpen
    if (!this.isOpen) {
      this.addRest = false
    }
  }

  newRestriction() {
    this.isOpenProposition = true
    this.restrictions.push({
      restriction: [
        {
          type: 'DateRange',
          config: {
            start: undefined,
            end: undefined,
          },
        },
      ],
    })
    this.changeDetectorRef.markForCheck()
  }

  removeRestriction(index: number) {
    this.restrictions.splice(index, 1)
    if (this.restrictions.length === 0) {
      this.addRest = false
    }
    this.changeDetectorRef.markForCheck()
  }

  // selectOption(type: string) {
  //   if (type === 'Jeu de restriction') {
  //     this.jeuDeRestriction = true
  //     console.log('jeu de restriction')
  //   }
  //   this.selectedType = type
  //   this.addRest = true
  //   this.isOpenProposition = false
  // }

  // closeRestriction() {
  //   this.addRest = false
  // }

  // resetSelectedType() {
  //   this.selectedType = ''
  // }

  updateRestriction(index: number, updatedRestrictions: Restriction[]) {
    this.restrictions[index] = { restriction: updatedRestrictions }
    this.changeDetectorRef.markForCheck()
    void this.update()
    this.changeRestriction = false
    this.changeDetectorRef.markForCheck()
  }

  // askRestriction() {
  //   this.changeRestriction = true
  //   this.changeDetectorRef.markForCheck()
  //   console.log('Restrictions 0 :', this.restrictions)
  // }

  private getMainDate(): RestrictionConfig['DateRange'] | null {
    const dateRange = this.restrictions[0].restriction.find((r) => r.type === 'DateRange')
    return dateRange ? (dateRange.config as RestrictionConfig['DateRange']) : null
  }

  protected async update(): Promise<void> {
    this.updating = true
    console.log('Updating ...')
    console.log('Restrictions : ', this.restrictions)
    try {
      const dateRange = this.getMainDate()
      const res = await Promise.all([
        /*firstValueFrom(
          this.courseService.updateActivity(this.activity, {
            openAt: dateRange?.start || undefined,
            closeAt: dateRange?.end || undefined,
          })
        ),*/
        ...(!this.activity.isChallenge
          ? [firstValueFrom(this.courseService.updateActivityRestrictions(this.activity, this.restrictions))]
          : []),
      ])
      console.log('La Suite ', res)
      this.activity = res[0]
      this.activityChange.emit(
        (this.activity = {
          ...this.activity,
          openAt: dateRange?.start || undefined,
          closeAt: dateRange?.end || undefined,
          state: res[0].state,
        })
      )

      this.dialogService.success('Activité mise à jour !')
    } catch {
      this.dialogService.error(
        "Une erreur est survenue lors de la mise à jour de l'activité, veuillez réessayer un peu plus tard !"
      )
    } finally {
      this.updating = false
      this.changeRestriction = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async reload(): Promise<void> {
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

  protected async delete(): Promise<void> {
    this.updating = true
    this.changeDetectorRef.markForCheck()
    try {
      await firstValueFrom(this.courseService.deleteActivity(this.activity))
      this.dialogService.success('Activité supprimée !')
    } catch {
      this.dialogService.error(
        "Une erreur est survenue lors de la suppression de l'activité, veuillez réessayer un peu plus tard !"
      )
    } finally {
      this.updating = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async close(): Promise<void> {
    this.updating = true
    this.changeDetectorRef.markForCheck()
    const activity = await firstValueFrom(this.courseService.closeActivity(this.activity))
    this.activityChange.emit(
      (this.activity = {
        ...this.activity,
        closeAt: activity.closeAt,
        state: activity.state,
      })
    )
    this.form.patchValue({
      closeAt: this.activity.closeAt,
    })
    this.updating = false
    this.changeDetectorRef.markForCheck()
  }

  protected async reopenForAll(): Promise<void> {
    this.updating = true
    this.changeDetectorRef.markForCheck()
    const activity = await firstValueFrom(this.courseService.reopenActivity(this.activity))
    this.activityChange.emit(
      (this.activity = {
        ...this.activity,
        closeAt: undefined,
        state: activity.state,
      })
    )
    this.form.patchValue({
      closeAt: this.activity.closeAt,
    })
    this.updating = false
    this.changeDetectorRef.markForCheck()
  }
}
