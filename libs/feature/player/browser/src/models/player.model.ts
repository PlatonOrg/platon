/**
 * Value set to the player url query param for controlling some feature of the play mode like :
 *
 * - enable fullscreen button on exercise cards
 * - Disabled click on elements that redirect to home page
 */
export const PLAYER_EDITOR_PREVIEW = 'editor-preview'

/**
 * Value set to the player url query param to hide an exercise card's title and author.
 * Used when an exercise is embedded inline in an open-class lesson (see exercise-parser.ts) :
 * that title/author is redundant there since the lesson already provides its own context.
 */
export const PLAYER_HIDE_EXERCISE_META = 'hide-exercise-meta'
