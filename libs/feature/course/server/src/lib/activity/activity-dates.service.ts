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
   * @param activities Liste des activités à mettre à jour
   * @returns Dates d'ouverture et de fermeture ou undefined
   */
  async updateActivitiesDates(
    activities: ActivityEntity[]
  ): Promise<{ start: Date | undefined; end: Date | undefined }> {
    const dateRangeGlobale: { start: Date | undefined; end: Date | undefined } = {
      start: undefined,
      end: undefined,
    }

    this.logger.debug('Mise à jour des dates des activités', this.request.user)

    for (const activity of activities) {
      if (activity?.restrictions && activity.restrictions.length > 0) {
        let isExist = false

        // Vérifier les restrictions pour l'utilisateur actuel
        for (const restriction of activity.restrictions) {
          const dateRange = await this.findUserAccess(activity, restriction.restriction, this.request.user)

          if (dateRange && activity) {
            activity.openAt = dateRange.start
            activity.closeAt = dateRange.end
            dateRangeGlobale.start = dateRange.start
            dateRangeGlobale.end = dateRange.end
            isExist = true

            const localStart = dateRange.start ? new Date(dateRange.start).toLocaleString() : 'undefined'
            const localEnd = dateRange.end ? new Date(dateRange.end).toLocaleString() : 'undefined'
            this.logger.log('Dates trouvées (local time)', localStart, localEnd)
            this.logger.log('Dates trouvées (UTC)', dateRange.start, dateRange.end)

            break // Sortir de la boucle une fois une date trouvée
          }
        }

        // Si aucune restriction spécifique trouvée, chercher les restrictions vides
        if (!isExist) {
          isExist = await this.handleEmptyRestrictions(activity, dateRangeGlobale)
        }

        // Si toujours pas de date trouvée, définir des dates par défaut dans le passé
        if (!isExist) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)

          activity.openAt = yesterday
          activity.closeAt = yesterday
          dateRangeGlobale.start = yesterday
          dateRangeGlobale.end = yesterday

          this.logger.log('Aucune restriction trouvée, dates par défaut :', yesterday)
        }
      }
    }

    return dateRangeGlobale
  }

  /**
   * Recherche des accès utilisateur dans les restrictions
   * @param activity Activité à vérifier
   * @param restrictions Liste des restrictions
   * @param user Utilisateur actuel
   * @returns Configuration de date ou null
   */
  private async findUserAccess(
    activity: Activity,
    restrictions: Restriction[],
    user: User
  ): Promise<RestrictionConfig['DateRange'] | null> {
    // Vérifier s'il existe des restrictions de type Members ou Groups
    const hasMembersRestriction = restrictions.some((r) => r.type === 'Members')
    const hasGroupRestriction = restrictions.some((r) => r.type === 'Groups')

    // Si les deux restrictions sont absentes et que c'est un étudiant, on autorise l'accès
    if (!hasMembersRestriction && !hasGroupRestriction) {
      // Vérifier s'il y a une restriction de type DateRange
      const dateRangeRestriction = restrictions.find((r) => r.type === 'DateRange')
      if (dateRangeRestriction) {
        return dateRangeRestriction.config as RestrictionConfig['DateRange']
      }
      return { start: undefined, end: undefined }
    }

    // Traitement normal pour chaque restriction
    for (const restriction of restrictions) {
      let hasAccess = false

      switch (restriction.type) {
        case 'Members':
          hasAccess = await this.checkMembers(activity, restriction.config as RestrictionConfig['Members'], user)
          break
        case 'Groups':
          hasAccess = await this.checkGroups(activity, restriction.config as RestrictionConfig['Groups'], user)
          break
        case 'Correctors':
          hasAccess = await this.checkMembers(activity, restriction.config as RestrictionConfig['Correctors'], user)
          break
        default:
          break
      }

      if (hasAccess) {
        // Vérifier si la restriction contient une DateRange
        const dateRangeRestriction = restrictions.find((r) => r.type === 'DateRange')
        if (dateRangeRestriction) {
          return dateRangeRestriction.config as RestrictionConfig['DateRange']
        }
        return { start: undefined, end: undefined }
      }
    }
    return null
  }

  /**
   * Vérifie si l'utilisateur est dans la liste des membres autorisés
   * @param activity Activité à vérifier
   * @param config Configuration de restriction
   * @param user Utilisateur actuel
   * @returns true si l'utilisateur a accès
   */
  private async checkMembers(
    activity: Activity,
    config: RestrictionConfig['Members'] | RestrictionConfig['Correctors'],
    user: User
  ): Promise<boolean> {
    // Vérifier si l'utilisateur est un membre du cours
    const member = await this.courseMemberService.getByUserIdAndCourseId(user.id, activity.courseId)
    if (!member.isPresent()) {
      return false
    }

    // Vérifier si l'utilisateur est dans la liste des membres
    if ('members' in config) {
      return config.members?.some((memberId: string) => member.get().id === memberId) ?? false
    }

    // Vérifier si l'utilisateur est dans la liste des correcteurs
    if ('correctors' in config) {
      return config.correctors?.some((correctorId: string) => member.get().id === correctorId) ?? false
    }

    return false
  }

  /**
   * Vérifie si l'utilisateur est dans un groupe autorisé
   * @param activity Activité à vérifier
   * @param config Configuration de restriction
   * @param user Utilisateur actuel
   * @returns true si l'utilisateur a accès
   */
  private async checkGroups(activity: Activity, config: RestrictionConfig['Groups'], user: User): Promise<boolean> {
    // Vérifier si l'utilisateur est dans un des groupes autorisés
    if (!activity) {
      return false
    }
    for (const groupId of config.groups || []) {
      const isMember = await this.courseGroupService.isMember(groupId, user.id)
      if (isMember) {
        return true
      }
    }

    return false
  }

  /**
   * Gère les restrictions vides (sans membres ni groupes)
   * @param activity Activité à vérifier
   * @param dateRangeGlobale Dates globales à mettre à jour
   * @returns true si une date a été trouvée
   */
  private async handleEmptyRestrictions(
    activity: ActivityEntity,
    dateRangeGlobale: { start: Date | undefined; end: Date | undefined }
  ): Promise<boolean> {
    if (!activity.restrictions || activity.restrictions.length === 0) {
      return false
    }
    for (const restriction of activity.restrictions) {
      let condition = 0

      for (const rest of restriction.restriction) {
        if (rest.type === 'Members') {
          const isMember = (config: RestrictionConfig[keyof RestrictionConfig]): config is { members?: string[] } => {
            return 'members' in config
          }

          if (isMember(rest.config) && (!rest.config.members || rest.config.members.length === 0)) {
            condition++
          }
        }

        if (rest.type === 'Groups') {
          const isGroup = (config: RestrictionConfig[keyof RestrictionConfig]): config is { groups?: string[] } => {
            return 'groups' in config
          }

          if (isGroup(rest.config) && (!rest.config.groups || rest.config.groups.length === 0)) {
            condition++
          }
        }

        // Si les deux conditions sont remplies (membres vide ET groupes vide)
        if (condition === 2) {
          const dateRangeRestriction = restriction.restriction.find((r) => r.type === 'DateRange')

          if (dateRangeRestriction) {
            const dateRange = dateRangeRestriction.config as RestrictionConfig['DateRange']
            activity.openAt = dateRange.start
            activity.closeAt = dateRange.end
            dateRangeGlobale.start = dateRange.start
            dateRangeGlobale.end = dateRange.end

            this.logger.log('Dates trouvées depuis restriction vide', dateRange.start, dateRange.end)
            return true
          }
        }
      }
    }

    return false
  }

  private reopenForAll(activity: Activity): void {
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
        ],
      })
    }
  }

  async reopenOrCloseAllRestrictions(activity: Activity, isOpen: boolean): Promise<void> {
    if (activity?.restrictions && activity.restrictions.length > 0) {
      activity.restrictions.forEach((restrictionList) => {
        restrictionList.restriction.forEach((restric) => {
          const isDateRange = (
            config: RestrictionConfig[keyof RestrictionConfig]
          ): config is RestrictionConfig['DateRange'] => {
            return config !== undefined || 'start' in config || 'end' in config
          }
          if (isDateRange(restric.config) && isOpen) {
            restric.config.end = undefined
          } else if (isDateRange(restric.config) && !isOpen) {
            restric.config.end = new Date()
          }
        })
      })

      if (isOpen) {
        const isNotEmpty = await this.handleEmptyRestrictions(activity as ActivityEntity, {
          start: undefined,
          end: undefined,
        })
        if (!isNotEmpty) {
          this.reopenForAll(activity) // Ajouter une restriction permettant aux gens qui n'ont pas d'accès d'avoir un accès par default
        }
      }
    }
  }
}
