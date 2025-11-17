import { Injectable } from '@angular/core'
import { userDisplayName } from '@platon/core/common'
import { CourseMember, CourseGroup } from '@platon/feature/course/common'
import { RestrictionConfig, RestrictionList } from '@platon/feature/course/common'

export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
}

export interface ConflictResult<T = string> {
  hasConflicts: boolean
  conflicts: Array<{ id: T; periods: number[] }>
}

@Injectable({
  providedIn: 'root',
})
export class ActivityRestrictionsValidatorService {
  /**
   * Valide toutes les restrictions d'accès et retourne le résultat
   */
  validateRestrictions(
    accessPeriods: RestrictionList[],
    courseMembers: CourseMember[],
    courseGroups: CourseGroup[]
  ): ValidationResult {
    // Vérification des "Tous les autres" multiples
    const othersCheck = this.checkMultipleOthers(accessPeriods)
    if (!othersCheck.isValid) {
      return othersCheck
    }

    // Vérification des périodes avec seulement des dates
    const dateOnlyCheck = this.checkDateOnlyPeriods(accessPeriods)
    if (!dateOnlyCheck.isValid) {
      return dateOnlyCheck
    }

    // Vérification des conflits de groupes
    const groupConflicts = this.checkGroupConflicts(accessPeriods)
    if (groupConflicts.hasConflicts) {
      const message = this.formatGroupConflictsMessage(groupConflicts, courseGroups)
      return { isValid: false, errorMessage: message }
    }

    // Vérification des conflits de membres
    const memberConflicts = this.checkMemberConflicts(accessPeriods, courseMembers)
    if (memberConflicts.hasConflicts) {
      const message = this.formatMemberConflictsMessage(memberConflicts, courseMembers)
      return { isValid: false, errorMessage: message }
    }

    return { isValid: true }
  }

  /**
   * Vérifie s'il y a plusieurs périodes avec "Tous les autres"
   */
  private checkMultipleOthers(accessPeriods: RestrictionList[]): ValidationResult {
    const periodsWithOthers = accessPeriods.filter((period) => period.restriction.some((r) => r.type === 'Others'))

    if (periodsWithOthers.length > 1) {
      return {
        isValid: false,
        errorMessage:
          'Vous avez plusieurs périodes d\'accès avec le type "Tous les autres".\n' +
          'Une seule est autorisée car elle inclut automatiquement tous les utilisateurs restants.\n' +
          "Supprimez ou modifiez pour en garder qu'une seule.",
      }
    }

    return { isValid: true }
  }

  /**
   * Vérifie les périodes qui n'ont que des dates sans définir qui peut accéder
   */
  private checkDateOnlyPeriods(accessPeriods: RestrictionList[]): ValidationResult {
    const result: { indices: number[]; details: string[] } = { indices: [], details: [] }

    accessPeriods.forEach((period, index) => {
      if (period.restriction.length === 1 && period.restriction[0].type === 'DateRange') {
        result.indices.push(index + 1)
        result.details.push(`Période n°${index + 1} : seulement une date définie`)
      }
    })

    if (result.indices.length > 0) {
      return {
        isValid: false,
        errorMessage:
          'Périodes incomplètes détectées :\n\n' +
          result.details.join('\n') +
          '\n\nChaque période doit définir QUI peut accéder (pas seulement QUAND).' +
          "\n\nAjoutez des types d'utilisateurs ou supprimez cette période.",
      }
    }

    return { isValid: true }
  }

  /**
   * Vérifie les conflits de groupes entre les périodes d'accès
   */
  checkGroupConflicts(accessPeriods: RestrictionList[]): ConflictResult<string> {
    const result: ConflictResult<string> = { hasConflicts: false, conflicts: [] }
    const groupToPeriods = new Map<string, number[]>()

    accessPeriods.forEach((period, periodIndex) => {
      period.restriction.forEach((restriction) => {
        if (restriction.type === 'Groups') {
          const config = restriction.config as RestrictionConfig['Groups']
          config.groups?.forEach((groupId) => {
            if (!groupToPeriods.has(groupId)) {
              groupToPeriods.set(groupId, [])
            }
            const periods = groupToPeriods.get(groupId)
            if (periods) {
              periods.push(periodIndex + 1)
            }
          })
        }
      })
    })

    groupToPeriods.forEach((periods, groupId) => {
      if (periods.length > 1) {
        result.hasConflicts = true
        result.conflicts.push({ id: groupId, periods })
      }
    })

    return result
  }

  /**
   * Vérifie les conflits de membres entre les périodes d'accès
   */
  checkMemberConflicts(accessPeriods: RestrictionList[], _courseMembers: CourseMember[]): ConflictResult<string> {
    const result: ConflictResult<string> = { hasConflicts: false, conflicts: [] }
    const memberToPeriods = new Map<string, number[]>()

    accessPeriods.forEach((period, periodIndex) => {
      period.restriction.forEach((restriction) => {
        if (restriction.type === 'Members') {
          const config = restriction.config as RestrictionConfig['Members']
          config.members?.forEach((memberId) => {
            if (!memberToPeriods.has(memberId)) {
              memberToPeriods.set(memberId, [])
            }
            const periods = memberToPeriods.get(memberId)
            if (periods) {
              periods.push(periodIndex + 1)
            }
          })
        }
      })
    })

    memberToPeriods.forEach((periods, memberId) => {
      if (periods.length > 1) {
        result.hasConflicts = true
        result.conflicts.push({ id: memberId, periods })
      }
    })

    return result
  }

  /**
   * Formate le message d'erreur pour les conflits de groupes
   */
  private formatGroupConflictsMessage(conflicts: ConflictResult<string>, courseGroups: CourseGroup[]): string {
    const conflictMessages = conflicts.conflicts.map((conflict) => {
      const groupName = this.getGroupName(conflict.id, courseGroups)
      return `${groupName} (périodes n°${conflict.periods.join(', ')})`
    })

    return (
      'Conflits de groupes détectés :\n\n' +
      conflictMessages.join('\n') +
      "\n\nUn groupe ne peut être assigné qu'à une seule période d'accès.\n" +
      'Supprimez les doublons pour éviter les conflits.'
    )
  }

  /**
   * Formate le message d'erreur pour les conflits de membres
   */
  private formatMemberConflictsMessage(conflicts: ConflictResult<string>, courseMembers: CourseMember[]): string {
    const conflictMessages = conflicts.conflicts.map((conflict) => {
      const memberName = this.getMemberName(conflict.id, courseMembers)
      return `${memberName} (périodes n°${conflict.periods.join(', ')})`
    })

    return (
      "Conflits d'utilisateurs détectés :\n\n" +
      conflictMessages.join('\n') +
      "\n\nUn utilisateur ne peut être assigné qu'à une seule période d'accès.\n" +
      'Supprimez les doublons pour éviter les conflits.'
    )
  }

  /**
   * Trouve le nom d'un groupe par son ID
   */
  private getGroupName(groupId: string, courseGroups: CourseGroup[]): string {
    const group = courseGroups.find((g) => g.id === groupId)
    return group?.name || `Groupe ${groupId}`
  }

  /**
   * Trouve le nom d'un membre par son ID
   */
  private getMemberName(memberId: string, courseMembers: CourseMember[]): string {
    const [memberIdPart] = memberId.split(':')
    const member = courseMembers.find((m) => m.id === memberIdPart)

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

  /**
   * Vérifie si au moins une période a la règle "Tous les autres"
   */
  hasOthersRule(accessPeriods: RestrictionList[]): boolean {
    return accessPeriods.some((period) => period.restriction.some((r) => r.type === 'Others'))
  }
}
