import { Injectable } from '@nestjs/common'
import { User, UserRoles } from '@platon/core/common'
import { Activity, Restriction, RestrictionConfig } from '@platon/feature/course/common'
import { CourseGroupService, CourseMemberService } from '@platon/feature/course/server'

@Injectable()
export class ActivityRestrictionCheckerService {
  activity: Activity | null = null

  constructor(private readonly courseMember: CourseMemberService, private readonly courseGroup: CourseGroupService) {}

  private async checkMembers(
    config: RestrictionConfig['Members'] | RestrictionConfig['Correctors'],
    user: User
  ): Promise<boolean> {
    if (!this.activity) {
      return false
    }

    // Si la liste est vide et que c'est un étudiant, on autorise l'accès
    /*if ('members' in config && (!config.members || config.members.length === 0) && user.role === UserRoles.student) {
      return true
    }*/

    const member = await this.courseMember.getByUserIdAndCourseId(user.id, this.activity.courseId)
    if (!member.isPresent()) {
      return false
    }

    if ('members' in config) {
      return config.members?.some((memberId) => member.get().id === memberId) ?? false
    }

    if ('correctors' in config) {
      return config.correctors?.some((correctorId) => member.get().id === correctorId) ?? false
    }

    return false
  }

  // Check if the user is in the group
  private async checkGroups(config: RestrictionConfig['Groups'], user: User): Promise<boolean> {
    // Si la liste des groupes est vide et que c'est un étudiant, on autorise l'accès
    /*if ((!config.groups || config.groups.length === 0) && user.role === UserRoles.student) {
      return true
    }*/

    if (!this.activity) {
      return false
    }

    for (const group of config.groups || []) {
      const isMember = await this.courseGroup.isMember(group, user.id)
      if (isMember) {
        return true
      }
    }

    return false
  }

  private async findUserAccess(
    restrictions: Restriction[],
    user: User
  ): Promise<RestrictionConfig['DateRange'] | null> {
    // Vérifier s'il existe des restrictions de type Members ou Group
    const hasMembersRestriction = restrictions.some((r) => r.type === 'Members')
    const hasGroupRestriction = restrictions.some((r) => r.type === 'Group')

    // Si les deux restrictions sont absentes et que c'est un étudiant, on autorise l'accès
    if (!hasMembersRestriction && !hasGroupRestriction && user.role === UserRoles.student) {
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
          hasAccess = await this.checkMembers(restriction.config as RestrictionConfig['Members'], user)
          break
        case 'Group':
          hasAccess = await this.checkGroups(restriction.config as RestrictionConfig['Groups'], user)
          break
        case 'Correctors':
          hasAccess = await this.checkMembers(restriction.config as RestrictionConfig['Correctors'], user)
          break
        case 'Jeu':
          if (restriction.restrictions) {
            const dateRange = await this.findUserAccess(restriction.restrictions, user)
            if (dateRange) {
              return dateRange
            }
          }
          continue
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

  private isWithinDateRange(config: RestrictionConfig['DateRange'], now: Date = new Date()): boolean {
    const { start, end } = config

    const startDate = start ? new Date(start) : null
    const endDate = end ? new Date(end) : null

    if (startDate && now < startDate) return false
    if (endDate && now > endDate) return false

    return true
  }

  async validateActivityAccess(activity: Activity, user: User): Promise<{ isAllowed: boolean; message?: string }> {
    try {
      this.activity = activity

      // Si pas de restrictions, accès autorisé
      if (!activity.restrictions || !Array.isArray(activity.restrictions) || activity.restrictions.length === 0) {
        return { isAllowed: true }
      }

      // Vérifier si l'utilisateur a des droits d'accès
      const dataRange = await this.findUserAccess(activity.restrictions, user)

      if (!dataRange) {
        return { isAllowed: false, message: "Vous n'avez pas les droits d'accès à cette activité." }
      } else if (dataRange.start === undefined && dataRange.end === undefined) {
        return { isAllowed: true }
      }

      const isAllowed = this.isWithinDateRange(dataRange)

      return {
        isAllowed,
        message: isAllowed ? undefined : "Vous n'êtes pas dans la période autorisée pour accéder à cette activité.",
      }
    } catch (error) {
      console.error('Error validating activity access:', error)
      return { isAllowed: false, message: "Une erreur est survenue lors de la vérification des droits d'accès." }
    }
  }
}
