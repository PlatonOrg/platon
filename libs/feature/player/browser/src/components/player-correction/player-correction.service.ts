import { Label } from '@platon/feature/result/common'

// === CONSTANTS ===
export const GRADE_BOUNDS = {
  MIN: 0,
  MAX: 100,
  ERROR: -1,
} as const

export const GRADE_OPTIONS = {
  PLATON: 'platon',
  MAX: 'max',
  MIN: 'min',
} as const

export class PlayerCorrectionService {
  // === UTILITY CLASSES ===
  /**
   * Utility class for grade calculations and validation
   */
  static validateGrade(grade: number): number {
    return Math.max(GRADE_BOUNDS.MIN, Math.min(GRADE_BOUNDS.MAX, grade))
  }

  static parseGradeChange(gradeChangeStr: string, baseGrade: number): number {
    const trimmed = gradeChangeStr.trim()
    if (!trimmed) return baseGrade

    if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
      return this.parseRelativeGrade(trimmed, baseGrade)
    } else {
      return this.parseAbsoluteGrade(trimmed)
    }
  }

  private static parseRelativeGrade(gradeChangeStr: string, baseGrade: number): number {
    const sign = gradeChangeStr.startsWith('+') ? 1 : -1
    const value = parseInt(gradeChangeStr.slice(1), 10)
    const change = isNaN(value) ? 0 : sign * value
    return this.validateGrade(baseGrade + change)
  }

  private static parseAbsoluteGrade(gradeChangeStr: string): number {
    const value = parseInt(gradeChangeStr, 10)
    return isNaN(value) ? GRADE_BOUNDS.MIN : this.validateGrade(value)
  }

  static computeGradeFromLabels(labelList: Label[], originalGrade: number, gradeAdjustments?: number): number {
    if (originalGrade === undefined || originalGrade === null) return GRADE_BOUNDS.MIN

    let totalRelativeChange = 0
    let absoluteGrade: number | null = null

    for (const label of labelList) {
      const gradeChange = label.gradeChange?.trim()
      if (!gradeChange) continue

      if (gradeChange.startsWith('+') || gradeChange.startsWith('-')) {
        const sign = gradeChange.startsWith('+') ? 1 : -1
        const value = parseInt(gradeChange.slice(1), 10)
        if (!isNaN(value)) {
          totalRelativeChange += sign * value + (gradeAdjustments ?? 0)
        }
      } else {
        const value = parseInt(gradeChange, 10)
        if (!isNaN(value)) {
          absoluteGrade = value + (gradeAdjustments ?? 0)
        }
      }
    }

    const finalGrade =
      absoluteGrade !== null ? absoluteGrade + totalRelativeChange : originalGrade + totalRelativeChange

    return this.validateGrade(finalGrade)
  }

  static computeGradeChange(labelList: Label[], originalGrade?: number, gradeAdjustments?: number): number | undefined {
    if (originalGrade === undefined) return undefined

    let totalGradeChange = 0
    let hasAbsoluteGrade = false
    let absoluteGrade = 0

    // Process all labels to calculate the final grade change
    labelList.forEach((label) => {
      const gradeChange = label.gradeChange
      if (gradeChange) {
        if (gradeChange.startsWith('+') || gradeChange.startsWith('-')) {
          // Relative grade change
          const sign = gradeChange.startsWith('+') ? 1 : -1
          const value = parseInt(gradeChange.slice(1))
          if (!isNaN(value)) {
            totalGradeChange += sign * value
          }
        } else {
          // Absolute grade change - use the last absolute grade found
          const value = parseInt(gradeChange)
          if (!isNaN(value)) {
            hasAbsoluteGrade = true
            absoluteGrade = value
          }
        }
      }
    })
    let finalGrade: number
    if (hasAbsoluteGrade) {
      finalGrade = absoluteGrade + (gradeAdjustments ?? 0)
    } else {
      finalGrade = originalGrade + totalGradeChange + (gradeAdjustments ?? 0)
    }

    // Ensure grade is within valid bounds (0-100)
    return Math.max(0, Math.min(100, finalGrade))
  }
}
