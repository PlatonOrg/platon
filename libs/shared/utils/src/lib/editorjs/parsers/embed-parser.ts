interface EmbedData {
  embed: string
  width?: number
  height?: number
  caption?: string
}

// N'accepte que des URLs https : ce sont des attributs HTML construits par interpolation de
// chaîne, pas du texte enrichi passé par le sanitizer d'EditorJS (contrairement aux blocs texte).
const SAFE_EMBED_URL_RE = /^https:\/\//

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char])

export const EmbedParser = function (data: EmbedData): string {
  if (!data?.embed || !SAFE_EMBED_URL_RE.test(data.embed)) {
    return ''
  }

  const src = escapeHtml(data.embed)
  const width = data.width ? ` width="${Number(data.width)}"` : ''
  const height = data.height ? ` height="${Number(data.height)}"` : ''
  const caption = data.caption ? `<div class="embed-caption">${escapeHtml(data.caption)}</div>` : ''

  return `<div class="embed"><iframe src="${src}"${width}${height} allowfullscreen frameborder="0"></iframe>${caption}</div>`
}
