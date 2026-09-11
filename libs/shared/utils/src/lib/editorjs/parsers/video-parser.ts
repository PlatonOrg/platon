interface VideoData {
  url: string
  caption?: string
}

// Accepte une URL externe en https, ou une URL relative (nos propres fichiers uploadés servis via
// /api/v1/courses/:courseId/files/:filename) — mais pas une URL protocol-relative ("//host/...")
// qui pointerait vers un hôte arbitraire.
const SAFE_VIDEO_URL_RE = /^(https:\/\/|\/(?!\/))/

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char])

export const VideoParser = function (data: VideoData): string {
  if (!data?.url || !SAFE_VIDEO_URL_RE.test(data.url)) {
    return ''
  }

  const src = escapeHtml(data.url)
  const caption = data.caption ? `<div class="video-caption">${escapeHtml(data.caption)}</div>` : ''

  return `<div class="video"><video src="${src}" controls></video>${caption}</div>`
}
