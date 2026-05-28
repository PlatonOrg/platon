import hljs from 'highlight.js'

interface CodeData {
  code: string
  language?: string
}

const SAFE_LANGUAGE_RE = /^[a-z0-9-]+$/

export const CodeParser = function (data: CodeData): string {
  const raw = data.language?.toLowerCase() ?? ''
  let language = SAFE_LANGUAGE_RE.test(raw) ? raw : 'plaintext'

  let highlighted: string
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(data.code, { language }).value
    } else {
      const autoResult = hljs.highlightAuto(data.code)
      highlighted = autoResult.value
      language = SAFE_LANGUAGE_RE.test(autoResult.language ?? '') ? autoResult.language! : 'plaintext'
    }
  } catch {
    highlighted = data.code
    language = 'plaintext'
  }

  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}
