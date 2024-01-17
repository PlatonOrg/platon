/** Exercise settings. */
export interface ActivitySettings {
  /** Duration of the activity in seconds (-1 for infinite). */
  duration?: number

  /** Activity authorized action buttons. */
  actions?: ActivityActionSettings

  /** Activity navigation options. */
  navigation?: ActivityNavigationSettings

  /** Activity feedback options */
  feedback?: ActivityFeedbackSettings

  /** Activity security options */
  security?: ActivitySecuritySettings
}

/** Settings specific to action buttons. */
export interface ActivityActionSettings {
  /** Number of attempts authorized (-1 for infinite). */
  retry?: number
  /** Display "hints" button. */
  hints?: boolean

  /** Display "reroll" button. */
  reroll?: boolean
  /** Display "theories" button. */
  theories?: boolean
  /** Display "solution" button. */
  solution?: boolean
}

/** Settings specific to feedbacks. */
export interface ActivityFeedbackSettings {
  /** Show feedback at the end of the activity. */
  review?: boolean
  /** Show feedback after exercise validation. */
  validation?: boolean
}

/** Settings specific to security */
export interface ActivitySecuritySettings {
  noCopyPaste?: boolean

  /**
   * Terminate the activity when the user loses focus (switch tab, switch os window, click anywhere outside the activity document page)
   */
  terminateOnLoseFocus?: boolean

  /**
   * Terminate the activity when the user leaves the page (switch tab, switch os window...)
   */
  terminateOnLeavePage?: boolean
}

/**
 * - `manual` => The user can jump between the exercises by using the navigation card.
 * - `composed` => All exercises are shown together.
 */
export type ActivityNavigationModes = 'manual' | 'composed'

/** Settings specific to navigation. */
export interface ActivityNavigationSettings {
  /**
   * Navigation mode.
   * - `manual` => The user can jump between the exercises by using the navigation card.
   * - `composed` => All exercises are shown together.
   */
  mode?: ActivityNavigationModes
}

/** Default settings for preview mode. */
export const defaultActivitySettings = (): ActivitySettings => ({
  actions: {
    retry: 1,
    hints: true,
    reroll: true,
    theories: true,
    solution: true,
  },
  duration: -1,
  feedback: {
    review: true,
    validation: true,
  },
  navigation: {
    mode: 'manual',
  },
  security: {
    noCopyPaste: false,
    terminateOnLeavePage: false,
    terminateOnLoseFocus: false,
  },
})
