import { Injectable } from '@nestjs/common'
import { User } from '@platon/core/common'
import { Activity, Restriction, RestrictionConfig } from '@platon/feature/course/common'
import { CourseGroupMemberService, CourseMemberService } from '@platon/feature/course/server'

@Injectable()
export class ActivityRestrictionCheckerService {
  activity: Activity | null = null

  constructor(
    private readonly coursegroup: CourseGroupMemberService,
    private readonly courseMember: CourseMemberService
  ) {}

  private async checkMembers(config: RestrictionConfig['Members'], user: User): Promise<boolean> {
    if (!this.activity) {
      return false
    }
    const member = await this.courseMember.getByUserIdAndCourseId(user.id, this.activity.courseId)
    if (!member.isPresent()) {
      return false
    }
    return config.members?.some((memberId) => member.get().id === memberId) ?? false
  }

  // Check if the user is in the group
  // Code Dangereux (Dangerous Code) // À revoir (To Review)
  private async checkGroups(config: RestrictionConfig['Groups'], user: User): Promise<boolean> {
    if (!config.groups?.length) return false // À revoir (To Review)
    if (this.activity) {
      const groups = await this.coursegroup.listGroupsMembers(config.groups)
      console.log(JSON.stringify(groups, null, 2))
      for (const group of groups) {
        console.log('group.user.id : \n' + group.userId + '\n')
        if (group.userId === user.id) {
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
        case 'Jeu':
          if (restriction.restrictions) {
            // console.log('Jeu EUUJHTG yvY DGGGGGG>>>>>>>>\n\n')
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

      const dataRange = await this.findUserAccess(activity.restrictions, user)
      // console.log('DEFDYHYEGGGGGGGGGGGGGGG uE                    vdyvdhvyh\n\n\n')
      console.log(dataRange)
      if (!dataRange) {
        return { isAllowed: false, message: "Vous n'avez pas les droits d'accès à cette activité." }
      } else if (dataRange.start === undefined && dataRange.end === undefined) {
        return { isAllowed: true }
      }
      const isAllowed = this.isWithinDateRange(dataRange)
      //dataRange.start && dataRange.end ? new Date() >= dataRange.start && new Date() <= dataRange.end : true
      console.log(isAllowed)

      console.log('DEFDYHYEGGGGGGGGGGGGGGG uE     22222222222222222222222               vdyvdhvyh\n\n\n')
      return {
        isAllowed,
        message: isAllowed ? undefined : "Vous n'êtes pas dans la période autorisée pour accéder à cette activité.",
      }
    } catch (error) {
      return { isAllowed: false, message: "Une erreur est survenue lors de la vérification des droits d'accès." }
    }
  }
}
