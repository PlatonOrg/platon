export enum FeedbackCategoryValue {
  STATEMENT = 'statement',
  ANSWER = 'answer',
  ACCESSIBILITY = 'accessibility',
  TECHNICAL = 'technical',
  OTHER = 'other',
}

export const feedbackCategoryLabels: Record<FeedbackCategoryValue, string> = {
  [FeedbackCategoryValue.STATEMENT]: "L'énoncé de l'exercice",
  [FeedbackCategoryValue.ANSWER]: 'Les modalités de réponse',
  [FeedbackCategoryValue.ACCESSIBILITY]: "L'accessibilité de l'exercice",
  [FeedbackCategoryValue.TECHNICAL]: "Le fonctionnement de l'exercice",
  [FeedbackCategoryValue.OTHER]: 'Autre chose',
}

export interface FeedbackCategory {
  readonly value: FeedbackCategoryValue
  readonly label: string
}

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = Object.entries(feedbackCategoryLabels).map(([value, label]) => ({
  value: value as FeedbackCategoryValue,
  label: label,
}))

export function getFeedbackCategoryLabel(value: FeedbackCategoryValue): string {
  return feedbackCategoryLabels[value]
}

export interface Feedback {
  readonly sessionId: string
  readonly exerciseTitle?: string
  readonly author?: string | null
  readonly category: FeedbackCategoryValue
  readonly message?: string
}
