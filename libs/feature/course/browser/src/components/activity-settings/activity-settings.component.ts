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
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
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
import { RestrictionManagerComponent } from './restriction-manager/restriction-manager.component'
import { CourseColorPickerComponent } from '../color-picker/color-picker.component'
import { userDisplayName } from '@platon/core/common'

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
  protected accessPeriods: RestrictionList[] = [] as RestrictionList[]

  currentHue = 210

  protected form = new FormGroup({
    openAt: new FormControl<Date | undefined>(undefined),
    closeAt: new FormControl<Date | undefined>(undefined),
    members: new FormControl<string[] | undefined>(undefined),
    correctors: new FormControl<string[] | undefined>(undefined),
    groups: new FormControl<string[] | undefined>(undefined),
  })

  protected editOpenDate = false
  protected editCloseDate = false
  protected tempOpenDate?: Date
  protected tempCloseDate?: Date

  @ViewChild('openDatePicker') openDatePicker?: any
  @ViewChild('closeDatePicker') closeDatePicker?: any

  private readonly loadingSignal = signal(false)
  private readonly updatingSignal = signal(false)

  readonly loading = computed(() => this.loadingSignal())
  readonly updating = computed(() => this.updatingSignal())
  readonly canSave = computed(() => !this.updating())

  protected courseMembers: CourseMember[] = []
  protected courseGroups: CourseGroup[] = []

  protected activityColors: number[] = []

  constructor(
    private readonly courseService: CourseService,
    private readonly dialogService: DialogService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.currentHue = this.activity.colorHue ?? 210

    this.activityColors = await firstValueFrom(this.courseService.getCourseColors(this.activity.courseId))

    this.loadingSignal.set(true)

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
      this.accessPeriods = [...this.activity.restrictions]
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
    if (updatedRestrictions.length === 0) {
      this.accessPeriods.splice(index, 1)
    } else {
      this.accessPeriods[index] = { restriction: updatedRestrictions }
    }
    this.changeDetectorRef.markForCheck()
  }

  protected newAccessPeriod() {
    this.accessPeriods.push({
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

  get accessPeriodsLength(): number {
    return this.accessPeriods.length
  }

  protected onDropAccessPeriod(event: CdkDragDrop<RestrictionList[]>) {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(this.accessPeriods, event.previousIndex, event.currentIndex)
      this.changeDetectorRef.markForCheck()
    }
  }

  private getMainDate(): RestrictionConfig['DateRange'] | { start: Date; end: Date } {
    if (this.accessPeriods.length === 0) {
      return { start: undefined, end: undefined }
    }
    const dateRange = this.accessPeriods[0].restriction.find((r) => r.type === 'DateRange')
    return dateRange ? (dateRange.config as RestrictionConfig['DateRange']) : { start: undefined, end: undefined }
  }

  private checkSameOthers(): boolean {
    const periodsWithOthers = this.accessPeriods.filter((period) => period.restriction.some((r) => r.type === 'Others'))
    return periodsWithOthers.length > 1
  }

  private checkDateOnlyPeriods(): { indices: number[]; details: string[] } {
    const result = { indices: [] as number[], details: [] as string[] }

    this.accessPeriods.forEach((period, index) => {
      if (period.restriction.length === 1 && period.restriction[0].type === 'DateRange') {
        result.indices.push(index + 1)
        result.details.push(`Période n°${index + 1} : seulement une date définie`)
      }
    })

    return result
  }

  /**
   * Vérifie les conflits de groupes entre les périodes d'accès
   */
  private checkGroupConflicts(): { hasConflicts: boolean; conflicts: Array<{ groupId: string; periods: number[] }> } {
    const result = { hasConflicts: false, conflicts: [] as Array<{ groupId: string; periods: number[] }> }
    const groupToPeriods = new Map<string, number[]>()

    this.accessPeriods.forEach((period, periodIndex) => {
      period.restriction.forEach((restriction) => {
        if (restriction.type === 'Groups') {
          const config = restriction.config as RestrictionConfig['Groups']
          config.groups?.forEach((groupId) => {
            if (!groupToPeriods.has(groupId)) {
              groupToPeriods.set(groupId, [])
            }
            groupToPeriods.get(groupId)!.push(periodIndex + 1)
          })
        }
      })
    })

    groupToPeriods.forEach((periods, groupId) => {
      if (periods.length > 1) {
        result.hasConflicts = true
        result.conflicts.push({ groupId, periods })
      }
    })

    return result
  }

  /**
   * Vérifie les conflits de membres entre les périodes d'accès
   */
  private checkMemberConflicts(): { hasConflicts: boolean; conflicts: Array<{ memberId: string; periods: number[] }> } {
    const result = { hasConflicts: false, conflicts: [] as Array<{ memberId: string; periods: number[] }> }
    const memberToPeriods = new Map<string, number[]>()

    this.accessPeriods.forEach((period, periodIndex) => {
      period.restriction.forEach((restriction) => {
        if (restriction.type === 'Members') {
          const config = restriction.config as RestrictionConfig['Members']
          config.members?.forEach((memberId) => {
            if (!memberToPeriods.has(memberId)) {
              memberToPeriods.set(memberId, [])
            }
            memberToPeriods.get(memberId)!.push(periodIndex + 1)
          })
        }
      })
    })

    memberToPeriods.forEach((periods, memberId) => {
      if (periods.length > 1) {
        result.hasConflicts = true
        result.conflicts.push({ memberId, periods })
      }
    })

    return result
  }

  /**
   * Trouve le nom d'un groupe par son ID
   */
  private getGroupName(groupId: string): string {
    const group = this.courseGroups.find((g) => g.id === groupId)
    return group?.name || `Groupe ${groupId}`
  }

  /**
   * Trouve le nom d'un membre par son ID
   */
  private getMemberName(memberId: string): string {
    const [memberIdPart] = memberId.split(':')
    const member = this.courseMembers.find((m) => m.id === memberIdPart)

    if (!member) {
      return `Membre ${memberId}`
    }

    // Si c'est un membre avec userId spécifique
    if (memberId.includes(':')) {
      const [, userId] = memberId.split(':')
      if (member.group) {
        const user = member.group.users.find((u) => u.id === userId)
        return user ? userDisplayName(user) : `Utilisateur ${userId}`
      }
    }

    return member.user ? userDisplayName(member.user) : member.group?.name || `Membre ${memberId}`
  }

  hasOthersRule(): boolean {
    return this.accessPeriods.some((period) => period.restriction.some((r) => r.type === 'Others'))
  }

  /**
   * Méthode mise à jour pour vérifier tous les conflits
   */
  private allCheckAccessPeriodspassed(): boolean {
    // Vérification des "Tous les autres" multiples
    if (this.checkSameOthers()) {
      this.dialogService.error(
        'Vous avez plusieurs périodes d\'accès avec le type "Tous les autres".\n' +
          'Une seule est autorisée car elle inclut automatiquement tous les utilisateurs restants.\n' +
          "Supprimez ou modifiez pour en garder qu'une seule.",
        { duration: 15000 }
      )
      return false
    }

    // Vérification des périodes avec seulement des dates
    const dateOnlyCheck = this.checkDateOnlyPeriods()
    if (dateOnlyCheck.indices.length > 0) {
      this.dialogService.error(
        'Périodes incomplètes détectées :\n\n' +
          dateOnlyCheck.details.join('\n') +
          '\n\nChaque période doit définir QUI peut accéder (pas seulement QUAND).' +
          "\n\nAjoutez des types d'utilisateurs ou supprimez cette période.",
        { duration: 15000 }
      )
      return false
    }

    // Vérification des conflits de groupes
    const groupConflicts = this.checkGroupConflicts()
    if (groupConflicts.hasConflicts) {
      const conflictMessages = groupConflicts.conflicts.map((conflict) => {
        const groupName = this.getGroupName(conflict.groupId)
        return `${groupName} (périodes n°${conflict.periods.join(', ')})`
      })

      this.dialogService.error(
        'Conflits de groupes détectés :\n\n' +
          conflictMessages.join('\n') +
          "\n\nUn groupe ne peut être assigné qu'à une seule période d'accès.\n" +
          'Supprimez les doublons pour éviter les conflits.',
        { duration: 15000 }
      )
      return false
    }

    // Vérification des conflits de membres
    const memberConflicts = this.checkMemberConflicts()
    if (memberConflicts.hasConflicts) {
      const conflictMessages = memberConflicts.conflicts.map((conflict) => {
        const memberName = this.getMemberName(conflict.memberId)
        return `${memberName} (périodes n°${conflict.periods.join(', ')})`
      })

      this.dialogService.error(
        "Conflits d'utilisateurs détectés :\n\n" +
          conflictMessages.join('\n') +
          "\n\nUn utilisateur ne peut être assigné qu'à une seule période d'accès.\n" +
          'Supprimez les doublons pour éviter les conflits.',
        { duration: 15000 }
      )
      return false
    }

    return true
  }

  /**
   * Désactive les dates dans le passé pour la date d'ouverture
   */
  protected disabledOpenDate = (current: Date): boolean => {
    return differenceInCalendarDays(current, new Date()) < 0
  }

  /**
   * Désactive les dates dans le passé et avant la date d'ouverture pour la date de fermeture
   */
  protected disabledCloseDate = (current: Date): boolean => {
    // Si on a une date d'ouverture (temporaire ou de l'activité), la date de fermeture doit être après
    const openDate = this.tempOpenDate || this.activity.openAt
    if (openDate) {
      return differenceInCalendarDays(current, new Date(openDate)) < 0
    }
    // Sinon, juste interdire les dates dans le passé
    return differenceInCalendarDays(current, new Date()) < 0
  }

  /**
   * Vérifie que la date de fermeture est supérieure à la date d'ouverture
   */
  private checkCloseDateIsSuperiorToOpenDate(openDate?: Date, closeDate?: Date): boolean {
    if (openDate && closeDate) {
      if (differenceInMilliseconds(closeDate, openDate) > 0) {
        return true
      }
      this.dialogService.error("La date de fermeture doit être supérieure à la date d'ouverture")
      return false
    }
    return true
  }

  async update(): Promise<void> {
    if (!this.allCheckAccessPeriodspassed()) {
      return
    }
    this.updatingSignal.set(true)
    try {
      if (this.activity.ignoreRestrictions && this.accessPeriods.length > 0) {
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

      const dateRange = this.getMainDate()
      const result = await Promise.all([
        ...(!this.activity.isChallenge
          ? [firstValueFrom(this.courseService.updateActivityRestrictions(this.activity, this.accessPeriods))]
          : []),
      ])
      this.activity = result[0]
      this.activityChange.emit(
        (this.activity = {
          ...this.activity,
          openAt: dateRange?.start || undefined,
          closeAt: dateRange?.end || undefined,
          state: result[0].state,
          colorHue: this.currentHue,
        })
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
    this.updatingSignal.set(false)
    this.changeDetectorRef.markForCheck()
  }

  protected async reopenForAll(): Promise<void> {
    this.updatingSignal.set(true)
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
    this.updatingSignal.set(false)
    this.changeDetectorRef.markForCheck()
  }
}
