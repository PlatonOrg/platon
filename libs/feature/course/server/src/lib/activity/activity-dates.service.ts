import { Injectable, Logger, Inject } from '@nestjs/common'
import { User, UserRoles } from '@platon/core/common'
import { Activity, Restriction, RestrictionConfig } from '@platon/feature/course/common'
import { ActivityEntity } from './activity.entity'
import { CourseMemberService } from '../course-member/course-member.service'
import { CourseGroupService } from '../course-group/course-group.service'
import { IRequest } from '@platon/core/server'
import { CLS_REQ } from 'nestjs-cls'

@Injectable()
export class ActivityDatesService {
  private readonly logger = new Logger(ActivityDatesService.name)

  constructor(
    @Inject(CLS_REQ)
    private readonly request: IRequest,
    private readonly courseMemberService: CourseMemberService,
    private readonly courseGroupService: CourseGroupService
  ) {}

  /**
   * Met à jour les dates d'ouverture et de fermeture des activités en fonction des restrictions
   */
  async updateActivitiesDates(
    activities: ActivityEntity[]
  ): Promise<{ start: Date | undefined; end: Date | undefined }> {
    const globalDateRange: { start: Date | undefined; end: Date | undefined } = {
      start: undefined,
      end: undefined,
    }

    for (const activity of activities) {
      const dateRange = await this.getActivityDatesForUser(activity, this.request.user)

      if (dateRange) {
        activity.openAt = dateRange.start
        activity.closeAt = dateRange.end
        globalDateRange.start = dateRange.start
        globalDateRange.end = dateRange.end
      }
    }

    return globalDateRange
  }

  /**
   * Détermine les dates d'accès pour un utilisateur et une activité donnés
   */
  private async getActivityDatesForUser(
    activity: ActivityEntity,
    user: User
  ): Promise<{ start: Date | undefined; end: Date | undefined } | null> {
    // Si ignoreRestrictions est activé, utiliser les dates de base de l'activité
    if (activity.ignoreRestrictions) {
      return {
        start: activity.openAt !== null ? activity.openAt : undefined,
        end: activity.closeAt !== null ? activity.closeAt : undefined,
      }
    }

    // Si pas de restrictions, utiliser les dates de base
    if (!activity.restrictions || activity.restrictions.length === 0) {
      return {
        start: activity.openAt !== null ? activity.openAt : undefined,
        end: activity.closeAt !== null ? activity.closeAt : undefined,
      }
    }

    // Chercher l'accès de l'utilisateur dans les périodes d'accès
    for (const restrictionList of activity.restrictions) {
      const accessResult = await this.checkUserAccessInPeriod(activity, restrictionList.restriction, user)

      if (accessResult.hasAccess) {
        return accessResult.dateRange
      }
    }

    // Si l'utilisateur n'a accès à aucune période spécifique, vérifier "Others"
    const othersAccess = await this.checkOthersAccess(activity, user)
    if (othersAccess) {
      return othersAccess
    }

    // Aucun accès trouvé - retourner les dates de l'activité avec fermeture dans le passé
    return this.getNoAccessDates(activity)
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
    dateRange: { start: Date | undefined; end: Date | undefined } | null
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
  private async checkOthersAccess(
    activity: ActivityEntity,
    user: User
  ): Promise<{ start: Date | undefined; end: Date | undefined } | null> {
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
  private extractDateRange(restrictions: Restriction[]): { start: Date | undefined; end: Date | undefined } {
    const dateRestriction = restrictions.find((r) => r.type === 'DateRange')

    if (dateRestriction) {
      return dateRestriction.config as RestrictionConfig['DateRange']
    }

    return { start: undefined, end: undefined }
  }

  /**
   * Retourne les dates pour un utilisateur sans accès
   */
  private getNoAccessDates(activity: ActivityEntity): { start: Date | undefined; end: Date | undefined } {
    const baseStart = activity.openAt
    const now = new Date()
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Hier

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

    for (const groupId of config.groups) {
      const isMember = await this.courseGroupService.isMember(groupId, user.id)
      if (isMember) {
        return true
      }
    }

    return false
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
