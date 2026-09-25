interface ExerciseData {
  resourceId: string
  resourceVersion: string
  title?: string
}

const SAFE_RESOURCE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SAFE_VERSION_RE = /^[a-zA-Z0-9_.-]+$/

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char])

export const ExerciseParser = function (data: ExerciseData): string {
  if (!data?.resourceId || !SAFE_RESOURCE_ID_RE.test(data.resourceId)) {
    return ''
  }

  const version = data.resourceVersion && SAFE_VERSION_RE.test(data.resourceVersion) ? data.resourceVersion : 'latest'

  const src = `/player/preview/${data.resourceId}?version=${encodeURIComponent(
    version
  )}&autoResize=true&hide-exercise-meta`
  const title = data.title ? `<div class="exercise-title">${escapeHtml(data.title)}</div>` : ''

  return `<div class="exercise">${title}<iframe class="exercise-frame" src="${escapeHtml(
    src
  )}" frameborder="0" scrolling="no"></iframe></div>`
}
