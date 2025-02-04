import { Injectable } from '@nestjs/common'
import { User, UserRoles } from '@platon/core/common'
import { Activity, Restriction, RestrictionConfig } from '@platon/feature/course/common'
import { CourseGroupService, CourseMemberService } from '@platon/feature/course/server'

@Injectable()
export class ActivityRestrictionCheckerService {
  activity: Activity | null = null

  constructor(
    //private readonly coursegroup: CourseGroupMemberService,
    private readonly courseMember: CourseMemberService,
    private readonly courseGroup: CourseGroupService
  ) {}

  private async checkMembers(
    config: RestrictionConfig['Members'] | RestrictionConfig['Correctors'],
    user: User
  ): Promise<boolean> {
    if (!this.activity) {
      return false
    }
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
  // Code Dangereux (Dangerous Code) // À revoir (To Review)
  private async checkGroups(config: RestrictionConfig['Groups'], user: User): Promise<boolean> {
    if (!config.groups?.length) return false // À revoir (To Review)
    if (this.activity) {
      for (const group of config.groups) {
        const isMember = await this.courseGroup.isMember(group, user.id)
        if (isMember) {
          return true
        }
      }
    }

    return false
  }

  private async findUserAccess(
    restrictions: Restriction[],
    user: User
  ): Promise<RestrictionConfig['DateRange'] | null> {
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
              console.log(dateRange)
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
      if (!activity.restrictions) {
        return { isAllowed: true }
      }
      if (user.role === UserRoles.teacher || user.role === UserRoles.admin) {
        // Donne un droit d'office à tous/toutes les profs et admins
        return { isAllowed: true }
      }

      const dataRange = await this.findUserAccess(activity.restrictions, user)
      console.log(dataRange)
      if (!dataRange) {
        return { isAllowed: false, message: "Vous n'avez pas les droits d'accès à cette activité." }
      } else if (dataRange.start === undefined && dataRange.end === undefined) {
        return { isAllowed: true }
      }
      const isAllowed = this.isWithinDateRange(dataRange)
      console.log(isAllowed)

      return {
        isAllowed,
        message: isAllowed ? undefined : "Vous n'êtes pas dans la période autorisée pour accéder à cette activité.",
      }
    } catch (error) {
      return { isAllowed: false, message: "Une erreur est survenue lors de la vérification des droits d'accès." }
    }
  }
}
