/* eslint-disable @typescript-eslint/no-explicit-any */
import { deepCopy, deepMerge } from '@platon/core/common'
import {
  ActivitySettings,
  ExerciseVariables,
  Variables,
  defaultActivitySettings,
} from '@platon/feature/compiler'
import { ActivityPlayer, ExercisePlayer } from '@platon/feature/player/common'
import { AnswerEntity, SessionEntity } from '@platon/feature/result/server'
import * as nunjucks from 'nunjucks'
import {
  withActivityFeedbacksGuard,
  withFeedbacksGuard,
  withHintGuard,
  withSolutionGuard,
  withTheoriesGuard,
} from './player-guards'

nunjucks.configure({ autoescape: false })

/**
 * Transforms recursivly all component objects to HTML code from `object`.
 * A component is an object with both `cid` and `selector` properties.
 * @param variables Object to transform.
 * @param reviewMode If true, the components will be disabled.
 * @returns A computed version of the object.
 */
export const withRenderedComponents = (variables: any, reviewMode?: boolean): any => {
  if (variables == null) {
    return variables
  }
  if (Array.isArray(variables)) {
    return variables.map((v) => withRenderedComponents(v, reviewMode))
  }
  if (typeof variables === 'object') {
    if (variables.cid && variables.selector) {
      if (reviewMode) {
        variables.disabled = true
      }
      const state = JSON.stringify(variables)
      const buffer = Buffer.from(state).toString('base64')
      return `
        <${variables.selector} cid='${variables.cid}' state='${buffer}'></${variables.selector}>
      `
      /*
        FOR NOW WE LOAD THE STATE BY ENCODING IT WITHIN THE STATE ATTRIBUTE
        IF THERE IS ANY PROBLEM WITH THE DECODING ON BROWSER SIDE, WE CAN SWITCH TO THE FOLLOWING CODE
         return `
          <${variables.selector} cid='${variables.cid}'></${variables.selector}>
          <script type="application/json" id='${variables.cid}'>${state}</script>
        `
      */
    }
    return Object.keys(variables).reduce((o, k) => {
      o[k] = withRenderedComponents(variables[k], reviewMode)
      return o
    }, {} as any)
  }

  return variables
}

/**
 * Transforms recursivly all Editor.js content to HTML code from `object`.
 * @param variables Object to transform.
 * @returns A computed version of the object.
 */
const withEditorJsContent = (variables: any): any => {
  if (variables == null) {
    return variables
  }
  if (Array.isArray(variables)) {
    return variables.map((v) => withEditorJsContent(v))
  }
  if (typeof variables === 'object') {
    return Object.keys(variables).reduce((o, k) => {
      o[k] = withEditorJsContent(variables[k])
      return o
    }, {} as any)
  }

  if (typeof variables === 'string') {
    const editorJsOutputRegex = /^\s*\{[\s\S]*"blocks"\s*:\s*\[[\s\S]*\][\s\S]*\}\s*$/
    const isEditorJsOutput = editorJsOutputRegex.test(variables)
    if (isEditorJsOutput) {
      return `<wc-editorjs-viewer>${variables}</wc-editorjs-viewer>`
    }
  }

  return variables
}

/**
 * Renders all keys of `variables` which are consired as nunjucks templates.
 * @param variables A list of variables.
 * @param reviewMode If true, the components will be disabled.
 * @returns The variables with rendered templates.
 */
export const withRenderedTemplates = (
  variables: Variables,
  reviewMode?: boolean
): ExerciseVariables => {
  const computed = withEditorJsContent(
    withRenderedComponents(variables, reviewMode)
  ) as ExerciseVariables

  const templates = ['title', 'statement', 'form', 'solution', 'feedback', 'hint']

  for (const k in computed) {
    if (templates.includes(k)) {
      if (typeof computed[k] === 'string') {
        computed[k] = nunjucks.renderString(computed[k] as string, computed)
      } else if (Array.isArray(computed[k])) {
        computed[k] = computed[k].map((v: string) => {
          return nunjucks.renderString(v, computed)
        })
      }
    }
  }

  computed['.meta'] = {
    ...(computed['.meta'] || {}),
    attempts: computed['.meta']?.attempts || 0,
  }

  return computed
}

/**
 * Creates new player for an activity session.
 * @param session An activity session.
 * @returns An activity player.
 */
export const withActivityPlayer = (session: SessionEntity): ActivityPlayer => {
  const { variables } = withActivityFeedbacksGuard(session)
  return {
    type: 'activity',
    sessionId: session.id,
    activityId: session.activityId,
    title: variables.title,
    author: variables.author,
    startedAt: session.startedAt,
    openAt: session.activity?.openAt,
    closeAt: session.activity?.closeAt,
    lastGradedAt: session.lastGradedAt,
    introduction: variables.introduction,
    conclusion: variables.conclusion,
    settings: variables.settings,
    navigation: variables.navigation,
  }
}

/**
 * Creates new player for an exercise session.
 * @param session An exercise session.
 * @returns An exercise player.
 */
export const withExercisePlayer = (
  session: SessionEntity,
  answer?: AnswerEntity
): ExercisePlayer => {
  const variables = withRenderedTemplates(answer?.variables || session.variables, answer != null)

  const activitySession = session.parent

  const activitySettings = (
    activitySession ? deepCopy(activitySession.variables.settings || {}) : defaultActivitySettings()
  ) as ActivitySettings

  const hint = withHintGuard(variables, activitySettings, answer)
  const solution = withSolutionGuard(variables, activitySettings, answer)
  const theories = withTheoriesGuard(variables, activitySettings, answer)
  const feedbacks = withFeedbacksGuard(variables, activitySettings, answer)

  // REROLL
  if (answer) {
    deepMerge(activitySettings, { actions: { reroll: false } })
  }

  // ATTEMPTS
  let remainingAttempts: number | undefined
  const { actions } = activitySettings
  if (actions?.retry && actions.retry !== -1) {
    remainingAttempts = actions.retry - (variables['.meta']?.attempts || 0)
  }

  return {
    type: 'exercise',
    settings: activitySettings,
    solution,
    feedbacks,
    theories,
    hints: !hint
      ? undefined
      : Array.isArray(hint)
      ? variables['.meta']?.consumedHints
        ? hint.slice(0, variables['.meta'].consumedHints)
        : []
      : hint.data,
    remainingAttempts,
    answerId: answer?.id,
    sessionId: session.id,
    author: variables.author,
    title: variables.title,
    form: variables.form,
    statement: variables.statement,
    startedAt: session.startedAt,
    lastGradedAt: session.lastGradedAt,
    correction: session?.correction
      ? {
          grade: session.correction.grade,
          authorId: session.correction.authorId,
          createdAt: session.correction.createdAt,
          updatedAt: session.correction.updatedAt,
        }
      : undefined,
  }
}
