import { Injectable, Logger, Inject } from '@nestjs/common'
import { User } from '@platon/core/common'
import { Activity, Restriction, RestrictionConfig } from '@platon/feature/course/common'
import { ActivityEntity } from './activity.entity'
import { CourseMemberService } from '../course-member/course-member.service'
import { CourseGroupService } from '../course-group/course-group.service'
import { IRequest } from '@platon/core/server'
import { CLS_REQ } from 'nestjs-cls'

/** Type pour la date d'ouverture et de fermeture d'une période d'accès */
type ActivityDateRange = {
  start: Date | undefined
  end: Date | undefined
}

@Injectable()
export class ActivityDatesService {
  private readonly logger = new Logger(ActivityDatesService.name)

  constructor(
    @Inject(CLS_REQ)
    private readonly request: IRequest,
    private readonly courseMemberService: CourseMemberService,
    private readonly courseGroupService: CourseGroupService
  ) {}

  /** Donne la  plage d'ouverture de base de l'activité.*/
  private getBaseDateRange(activity: ActivityEntity): ActivityDateRange {
    return {
      start: activity.openAt ?? undefined,
      end: activity.closeAt ?? undefined,
    }
  }

  /** Donne la liste de toutes les périodes d'accès pour un utilisateur sur une activité
   * cas où il appartient à deux groupes avec deux périodes différentes
   */
  private async getActivityDateRangesForUser(activity: ActivityEntity, user: User): Promise<ActivityDateRange[]> {
    if (activity.ignoreRestrictions) {
      return [this.getBaseDateRange(activity)]
    }

    const restrictionLists = activity.restrictions ?? []

    if (restrictionLists.length === 0) {
      return [this.getBaseDateRange(activity)]
    }

    const eligibleRanges: ActivityDateRange[] = []

    for (const restrictionList of restrictionLists) {
      const restrictions = restrictionList.restriction ?? []

      // Others est traité séparément comme période de repli.
      if (restrictions.some((r) => r.type === 'Others')) {
        continue
      }

      const resultAccess = await this.checkUserAccessInPeriod(activity, restrictions, user)

      if (resultAccess.hasAccess && resultAccess.dateRange) {
        eligibleRanges.push(resultAccess.dateRange)
      }
    }

    // Une période Others s'applique uniquement si aucune période
    // spécifique ou universelle n'a été trouvée.
    if (eligibleRanges.length === 0) {
      const othersRange = await this.checkOthersAccess(activity, user)

      if (othersRange) {
        eligibleRanges.push(othersRange)
      }
    }

    return eligibleRanges
  }

  /**
   * Met à jour les dates d'ouverture et de fermeture des activités en fonction des restrictions
   * Renvoie la date d'ouverture la plus proche. Si on a plusieurs dates
   * */
  async updateActivitiesDates(activities: ActivityEntity[]): Promise<ActivityDateRange> {
    const globalDateRange: ActivityDateRange = {
      start: undefined,
      end: undefined,
    }

    const now = Date.now()

    for (const activity of activities) {
      if (activity.ignoreRestrictions) {
        continue
      }

      const ranges = await this.getActivityDateRangesForUser(activity, this.request.user)

      // Priorité à une période déjà ouverte.
      const currentRange = ranges.find((range) => this.isDateRangeOpen(range, now))

      // Sinon, rechercher la prochaine période à venir.
      const nextRange = ranges
        .filter((range) => {
          if (!range.start) {
            return false
          }

          const start = new Date(range.start).getTime()
          const end = range.end ? new Date(range.end).getTime() : undefined

          return Number.isFinite(start) && start > now && (end === undefined || (Number.isFinite(end) && end >= start))
        })
        .sort((a, b) => {
          return new Date(a.start!).getTime() - new Date(b.start!).getTime()
        })[0]

      // Période actuelle, prochaine période, ou activité fermée.
      const dateRange = currentRange ?? nextRange ?? this.getNoAccessDates(activity)

      activity.openAt = dateRange.start
      activity.closeAt = dateRange.end

      globalDateRange.start = dateRange.start
      globalDateRange.end = dateRange.end
    }

    return globalDateRange
  }

  /**Indique si l'on est actuellement dans la fenêtre d'ouverture de l'activité */
  private isDateRangeOpen(range: ActivityDateRange, now: number): boolean {
    const start = range.start ? new Date(range.start).getTime() : undefined
    const end = range.end ? new Date(range.end).getTime() : undefined

    if (start !== undefined && !Number.isFinite(start)) {
      return false
    }

    if (end !== undefined && !Number.isFinite(end)) {
      return false
    }

    if (start !== undefined && now < start) {
      return false
    }

    if (end !== undefined && now > end) {
      return false
    }

    return true
  }

  /**
   * Vérifie si l'utilisateur a le droit d'accéder à l'activité à l'instant T
   * selon ses dates d'ouverture/fermeture et ses restrictions.
   */
  async isActivityOpenForUser(activity: ActivityEntity, user: User): Promise<boolean> {
    const ranges = await this.getActivityDateRangesForUser(activity, user)
    const now = Date.now()

    return ranges.some((range) => this.isDateRangeOpen(range, now))
  }

  /**
   * Vérifie l'accès d'un utilisateur dans une période spécifique
   */
  private async checkUserAccessInPeriod(
    activity: Activity,
    restrictions: Restriction[],
    user: User
  ): Promise<{
    hasAccess: boolean
    dateRange: ActivityDateRange | null
  }> {
    // Si la période contient "Others", on ne la traite pas ici
    if (restrictions.some((r) => r.type === 'Others')) {
      return { hasAccess: false, dateRange: null }
    }

    let userHasAccess = false

    for (const restriction of restrictions) {
      switch (restriction.type) {
        case 'Members':
          userHasAccess = await this.checkMembersAccess(
            activity,
            restriction.config as RestrictionConfig['Members'],
            user
          )
          break
        case 'Groups':
          userHasAccess = await this.checkGroupsAccess(
            activity,
            restriction.config as RestrictionConfig['Groups'],
            user
          )
          break
        case 'Correctors':
          userHasAccess = await this.checkCorrectorsAccess(
            activity,
            restriction.config as RestrictionConfig['Correctors'],
            user
          )
          break
      }

      if (userHasAccess) {
        break
      }
    }

    if (!userHasAccess) {
      return { hasAccess: false, dateRange: null }
    }

    // Utilisateur a accès, récupérer les dates de cette période
    const dateRange = this.extractDateRange(restrictions)
    return { hasAccess: true, dateRange }
  }

  /**
   * Vérifie l'accès "Others" pour un utilisateur
   */
  private async checkOthersAccess(activity: ActivityEntity, user: User): Promise<ActivityDateRange | null> {
    if (!activity.restrictions) {
      return null
    }

    // Trouver la période avec "Others"
    for (const restrictionList of activity.restrictions) {
      const hasOthers = restrictionList.restriction.some((r) => r.type === 'Others')

      if (hasOthers) {
        // Vérifier que l'utilisateur n'est dans aucune autre période spécifique
        const isInSpecificPeriod = await this.isUserInAnySpecificPeriod(activity, user)

        if (!isInSpecificPeriod) {
          return this.extractDateRange(restrictionList.restriction)
        }
      }
    }

    return null
  }

  /**
   * Vérifie si un utilisateur est dans une période spécifique (non-Others)
   */
  private async isUserInAnySpecificPeriod(activity: Activity, user: User): Promise<boolean> {
    if (!activity.restrictions) {
      return false
    }

    for (const restrictionList of activity.restrictions) {
      if (restrictionList.restriction.some((r) => r.type === 'Others')) {
        continue
      }

      const accessResult = await this.checkUserAccessInPeriod(activity, restrictionList.restriction, user)
      if (accessResult.hasAccess) {
        return true
      }
    }

    return false
  }

  /**
   * Extrait la date range d'une liste de restrictions
   */
  private extractDateRange(restrictions: Restriction[]): ActivityDateRange {
    const dateRestriction = restrictions.find((r) => r.type === 'DateRange')

    if (dateRestriction) {
      return dateRestriction.config as RestrictionConfig['DateRange']
    }

    return { start: undefined, end: undefined }
  }

  /**
   * Retourne les dates pour un utilisateur sans accès
   */
  private getNoAccessDates(_activity: ActivityEntity): ActivityDateRange {
    const pastDate = new Date('Invalid Date')
    return {
      start: pastDate,
      end: pastDate,
    }
  }

  /**
   * Vérifie l'accès d'un utilisateur dans la liste des membres
   */
  private async checkMembersAccess(
    activity: Activity,
    config: RestrictionConfig['Members'],
    user: User
  ): Promise<boolean> {
    const member = await this.courseMemberService.getByUserIdAndCourseId(user.id, activity.courseId)

    if (!member.isPresent()) {
      return false
    }

    return config.members?.includes(member.get().id) ?? false
  }

  /**
   * Vérifie l'accès d'un utilisateur dans la liste des correcteurs
   */
  private async checkCorrectorsAccess(
    activity: Activity,
    config: RestrictionConfig['Correctors'],
    user: User
  ): Promise<boolean> {
    const member = await this.courseMemberService.getByUserIdAndCourseId(user.id, activity.courseId)

    if (!member.isPresent()) {
      return false
    }

    return config.correctors?.includes(member.get().id) ?? false
  }

  /**
   * Vérifie l'accès d'un utilisateur dans les groupes autorisés
   */
  private async checkGroupsAccess(
    activity: Activity,
    config: RestrictionConfig['Groups'],
    user: User
  ): Promise<boolean> {
    if (!config.groups?.length) {
      return false
    }
    const memberships = await Promise.all(
      config.groups.map((groupId) => this.courseGroupService.isMember(groupId, user.id))
    )

    return memberships.some(Boolean)
  }

  /**
   * Rouvre ou ferme toutes les restrictions d'une activité
   */
  async reopenOrCloseAllRestrictions(activity: Activity, isOpen: boolean): Promise<void> {
    if (!activity.restrictions?.length) {
      return
    }

    activity.restrictions.forEach((restrictionList) => {
      restrictionList.restriction.forEach((restriction) => {
        if (restriction.type === 'DateRange') {
          const config = restriction.config as RestrictionConfig['DateRange']

          if (isOpen) {
            config.end = undefined
          } else {
            config.end = new Date()
            if (config.start && new Date(config.start).getTime() > new Date(config.end).getTime()) {
              config.start = undefined
            }
          }
        }
      })
    })

    // Si on rouvre et qu'il n'y a aucune période accessible, ajouter une période "Others"
    if (isOpen) {
      const hasAccessiblePeriod = activity.restrictions.some((restrictionList) =>
        restrictionList.restriction.some((r) => r.type === 'Others')
      )

      if (!hasAccessiblePeriod) {
        this.addDefaultOthersPeriod(activity)
      }
    }
  }

  /**
   * Ajoute une période "Others" par défaut pour donner accès à tous
   */
  private addDefaultOthersPeriod(activity: Activity): void {
    if (activity?.restrictions) {
      activity.restrictions.push({
        restriction: [
          {
            type: 'DateRange',
            config: {
              start: undefined,
              end: undefined,
            },
          },
          {
            type: 'Others',
            config: {
              enabled: true,
            },
          },
        ],
      })
    }
  }
}
