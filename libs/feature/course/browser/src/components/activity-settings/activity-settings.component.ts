import { CommonModule } from '@angular/common'
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  signal,
  ViewChild,
} from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'

import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
import differenceInMilliseconds from 'date-fns/differenceInMilliseconds'

import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker'
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzCardModule } from 'ng-zorro-antd/card'
import { NzDividerModule } from 'ng-zorro-antd/divider'

import { AuthService, DialogModule, DialogService } from '@platon/core/browser'
import {
  Activity,
  calculateActivityOpenState,
  CourseGroup,
  CourseMember,
  Restriction,
  RestrictionConfig,
  RestrictionList,
} from '@platon/feature/course/common'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { firstValueFrom } from 'rxjs'
import { CourseService } from '../../api/course.service'
import { RestrictionManagerComponent } from './restriction-manager/restriction-manager.component'
import { CourseColorPickerComponent } from '../color-picker/color-picker.component'
import { User } from '@platon/core/common'
import { ActivityRestrictionsValidatorService } from '../../services/activity-restrictions-validator.service'

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
    DragDropModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    NzSpinModule,
    NzButtonModule,
    NzSkeletonModule,
    NzDatePickerModule,
    NzPopconfirmModule,
    NzCardModule,
    NzDividerModule,
    DialogModule,
    RestrictionManagerComponent,
    CourseColorPickerComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CourseActivitySettingsComponent implements OnInit {
  @Input() activity!: Activity
  @Output() activityChange = new EventEmitter<Activity>()
  @Output() saveRequested = new EventEmitter<void>()
  protected accessPeriods = signal<RestrictionList[]>([])

  currentHue = 210

  protected editOpenDate = false
  protected editCloseDate = false
  protected tempOpenDate?: Date
  protected tempCloseDate?: Date

  @ViewChild('openDatePicker') openDatePicker?: unknown
  @ViewChild('closeDatePicker') closeDatePicker?: unknown

  private readonly loadingSignal = signal(false)
  private readonly updatingSignal = signal(false)

  readonly loading = computed(() => this.loadingSignal())
  readonly updating = computed(() => this.updatingSignal())
  readonly canSave = computed(() => !this.updating())

  protected courseMembers: CourseMember[] = []
  protected courseGroups: CourseGroup[] = []

  protected activityColors: number[] = []
  private user?: User

  constructor(
    private readonly courseService: CourseService,
    private readonly dialogService: DialogService,
    private readonly authService: AuthService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly validatorService: ActivityRestrictionsValidatorService
  ) {}

  async ngOnInit(): Promise<void> {
    this.currentHue = this.activity.colorHue ?? 210

    this.activityColors = await firstValueFrom(this.courseService.getCourseColors(this.activity.courseId))

    this.loadingSignal.set(true)
    this.user = (await this.authService.ready()) as User

    const course = await firstValueFrom(
      this.courseService.find({
        id: this.activity.courseId,
      })
    )

    const [courseMembers, _activityMembers, _activityCorrectors, courseGroups, activityGroups] = await Promise.all([
      firstValueFrom(this.courseService.searchMembers(course)),
      firstValueFrom(this.courseService.searchActivityMembers(this.activity)),
      firstValueFrom(this.courseService.searchActivityCorrector(this.activity)),
      firstValueFrom(this.courseService.listGroups(course.id)),
      firstValueFrom(this.courseService.searchActivityGroups(this.activity.id)),
    ])

    this.courseMembers = courseMembers.resources
    this.courseGroups = courseGroups.resources
    console.log(this.courseMembers, activityGroups.resources)

    if (this.activity.restrictions && this.activity?.restrictions.length > 0) {
      this.accessPeriods.set([...this.activity.restrictions])
      console.debug('Loaded restrictions:', this.activity.restrictions)
    }

    this.tempOpenDate = this.activity.openAt ? new Date(this.activity.openAt) : undefined
    this.tempCloseDate = this.activity.closeAt ? new Date(this.activity.closeAt) : undefined

    this.loadingSignal.set(false)
    this.changeDetectorRef.markForCheck()
  }

  onHueChange(newHue: number): void {
    this.currentHue = newHue
    this.changeDetectorRef.markForCheck()
  }

  protected updateRestriction(index: number, updatedRestrictions: Restriction[]) {
    this.accessPeriods.update((periods) => {
      if (updatedRestrictions.length === 0) {
        return periods.filter((_, i) => i !== index)
      } else {
        const updated = [...periods]
        updated[index] = { restriction: updatedRestrictions }
        return updated
      }
    })
  }

  protected newAccessPeriod() {
    this.accessPeriods.update((periods) => [
      ...periods,
      {
        restriction: [
          {
            type: 'DateRange',
            config: {
              start: undefined,
              end: undefined,
            },
          },
        ],
      },
    ])
  }

  get accessPeriodsLength(): number {
    return this.accessPeriods().length
  }

  protected onDropAccessPeriod(event: CdkDragDrop<RestrictionList[]>) {
    if (event.previousIndex !== event.currentIndex) {
      this.accessPeriods.update((periods) => {
        const updated = [...periods]
        moveItemInArray(updated, event.previousIndex, event.currentIndex)
        return updated
      })
    }
  }

  hasOthersRule(): boolean {
    return this.validatorService.hasOthersRule(this.accessPeriods())
  }

  private allCheckAccessPeriodspassed(): boolean {
    const result = this.validatorService.validateRestrictions(
      this.accessPeriods(),
      this.courseMembers,
      this.courseGroups
    )

    if (!result.isValid && result.errorMessage) {
      this.dialogService.error(result.errorMessage, { duration: 15000 })
    }

    return result.isValid
  }

  protected disabledOpenDate = (current: Date): boolean => {
    return differenceInCalendarDays(current, new Date()) < 0
  }

  protected disabledCloseDate = (current: Date): boolean => {
    // Si on a une date d'ouverture (temporaire ou de l'activité), la date de fermeture doit être après
    const openDate = this.tempOpenDate || this.activity.openAt
    if (openDate) {
      return differenceInCalendarDays(current, new Date(openDate)) < 0
    }
    // Sinon, juste interdire les dates dans le passé
    return differenceInCalendarDays(current, new Date()) < 0
  }

  private checkCloseDateIsSuperiorToOpenDate(openDate?: Date, closeDate?: Date): boolean {
    if (openDate && closeDate) {
      if (differenceInMilliseconds(closeDate, openDate) > 0) {
        return true
      }
      if (closeDate !== undefined) {
        console.log(closeDate, openDate)
        this.dialogService.error("La date de fermeture doit être supérieure à la date d'ouverture")
        return false
      }
    }
    return true
  }

  private async getUserSpecificDate(_defaultDate?: Date): Promise<{ start: Date | undefined; end: Date | undefined }> {
    if (!this.user) return { start: undefined, end: undefined }

    const userSpecificPeriod = await this.findUserSpecificAccessPeriod()
    if (userSpecificPeriod) {
      const dateRange = userSpecificPeriod.restriction.find((r) => r.type === 'DateRange')
      if (dateRange) {
        return (dateRange.config as RestrictionConfig['DateRange']) || { start: undefined, end: undefined }
      }
    }

    return { start: undefined, end: undefined }
  }

  private async findUserSpecificAccessPeriod(): Promise<RestrictionList | null> {
    if (!this.user) return null
    for (const period of this.accessPeriods()) {
      const membersRestriction = period.restriction.find((r) => r.type === 'Members')
      if (membersRestriction) {
        const config = membersRestriction.config as RestrictionConfig['Members']
        const isUserInMembers = config.members?.some((memberId) => {
          if (memberId.includes(':')) {
            const [, userId] = memberId.split(':')
            return userId === this.user?.id
          } else {
            const member = this.courseMembers.find((m) => m.id === memberId)
            return member?.user?.id === this.user?.id
          }
        })
        if (isUserInMembers) return period
      }

      const correctorsRestriction = period.restriction.find((r) => r.type === 'Correctors')
      if (correctorsRestriction) {
        const config = correctorsRestriction.config as RestrictionConfig['Correctors']
        const isUserInCorrectors = config.correctors?.some((memberId) => {
          if (memberId.includes(':')) {
            const [, userId] = memberId.split(':')
            return userId === this.user?.id
          } else {
            const member = this.courseMembers.find((m) => m.id === memberId)
            return member?.user?.id === this.user?.id
          }
        })
        if (isUserInCorrectors) return period
      }

      const groupsRestriction = period.restriction.find((r) => r.type === 'Groups')
      if (groupsRestriction) {
        const config = groupsRestriction.config as RestrictionConfig['Groups']
        const groups = config.groups || []
        for (const groupId of groups) {
          const isMemberOfGroup = await firstValueFrom(
            this.courseService.isMemberOfGroup(this.activity.courseId, groupId)
          )
          if (isMemberOfGroup) {
            return period
          }
        }
      }
    }
    return null
  }

  async update(): Promise<void> {
    if (!this.allCheckAccessPeriodspassed()) {
      return
    }
    this.updatingSignal.set(true)
    try {
      const periods = this.accessPeriods()
      if (this.activity.ignoreRestrictions && periods.length > 0) {
        await firstValueFrom(
          this.courseService.updateActivity(this.activity, {
            colorHue: this.currentHue,
            ignoreRestrictions: false,
          })
        )
      } else if (this.activity.ignoreRestrictions) {
        if (!this.checkCloseDateIsSuperiorToOpenDate(this.tempOpenDate, this.tempCloseDate)) {
          return
        }
        await firstValueFrom(
          this.courseService.updateActivity(this.activity, {
            colorHue: this.currentHue,
            openAt: this.tempOpenDate,
            closeAt: this.tempCloseDate,
          })
        )
      }

      const result = await Promise.all([
        ...(!this.activity.isChallenge
          ? [firstValueFrom(this.courseService.updateActivityRestrictions(this.activity, periods))]
          : []),
      ])
      this.activity = result[0]
      if (periods.length > 0) {
        const userSpecificDate = await this.getUserSpecificDate()
        this.activityChange.emit(
          (this.activity = {
            ...this.activity,
            openAt: userSpecificDate.start,
            closeAt: userSpecificDate.end,
            state: calculateActivityOpenState({ openAt: userSpecificDate.start, closeAt: userSpecificDate.end }),
            colorHue: this.currentHue,
          })
        )
      } else {
        this.activityChange.emit(
          (this.activity = {
            ...this.activity,
            openAt: this.activity.openAt,
            closeAt: this.activity.closeAt,
            state: result[0].state,
            colorHue: this.currentHue,
          })
        )
      }

      // Quick fix pour attribuer les correcteurs. À revoir plus tard.
      // TODO: Optimiser cette partie pour que ce soit fait côté serveur lors de la mise à jour des restrictions.
      await firstValueFrom(
        this.courseService.updateActivityCorrectors(
          this.activity,
          this.getCorrectors().map((memberId) => {
            return {
              userId: this.courseMembers.find((m) => memberId.startsWith(m.id))?.user?.id,
              memberId,
            }
          })
        )
      )

      this.dialogService.success('Activité mise à jour !')
      this.saveRequested.emit()
    } catch (error) {
      console.error("Échec à l'étape:", error)
      this.dialogService.error(
        "Une erreur est survenue lors de la mise à jour de l'activité, veuillez réessayer un peu plus tard !"
      )
    } finally {
      this.updatingSignal.set(false)
      this.changeDetectorRef.markForCheck()
    }
  }

  private getCorrectors(): string[] {
    const correctors = new Set<string>()
    this.accessPeriods()
      .flatMap((period: RestrictionList) =>
        period.restriction
          .filter((r: Restriction) => r.type === 'Correctors')
          .flatMap((r: Restriction) => (r.config as RestrictionConfig['Correctors']).correctors || [])
      )
      .forEach((corrector: string) => correctors.add(corrector))
    return Array.from(correctors)
  }

  protected async reload(): Promise<void> {
    this.updatingSignal.set(true)
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
      this.updatingSignal.set(false)
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async delete(): Promise<void> {
    this.updatingSignal.set(true)
    this.changeDetectorRef.markForCheck()
    try {
      await firstValueFrom(this.courseService.deleteActivity(this.activity))
      this.dialogService.success('Activité supprimée !')
    } catch {
      this.dialogService.error(
        "Une erreur est survenue lors de la suppression de l'activité, veuillez réessayer un peu plus tard !"
      )
    } finally {
      this.updatingSignal.set(false)
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async close(): Promise<void> {
    this.updatingSignal.set(true)
    this.changeDetectorRef.markForCheck()
    const activity = await firstValueFrom(this.courseService.closeActivity(this.activity))
    if (activity.restrictions) {
      this.accessPeriods.set(activity.restrictions)
    }
    this.activityChange.emit(
      (this.activity = {
        ...this.activity,
        closeAt: activity.closeAt,
        state: activity.state,
      })
    )

    this.updatingSignal.set(false)
    this.changeDetectorRef.markForCheck()
  }

  protected async reopenForAll(): Promise<void> {
    this.updatingSignal.set(true)
    this.changeDetectorRef.markForCheck()
    const activity = await firstValueFrom(this.courseService.reopenActivity(this.activity))
    if (activity.restrictions) {
      this.accessPeriods.set(activity.restrictions)
    }
    this.activityChange.emit(
      (this.activity = {
        ...this.activity,
        closeAt: undefined,
        state: activity.state,
      })
    )
    this.updatingSignal.set(false)
    this.changeDetectorRef.markForCheck()
  }
}
