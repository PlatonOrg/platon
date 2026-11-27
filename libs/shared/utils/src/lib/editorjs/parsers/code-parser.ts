import defaultHljs from 'highlight.js'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore : no sub-path types in highlight.js v10
import hljsCore from 'highlight.js/lib/core'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import bash from 'highlight.js/lib/languages/bash'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import javascript from 'highlight.js/lib/languages/javascript'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import json from 'highlight.js/lib/languages/json'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import python from 'highlight.js/lib/languages/python'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import shell from 'highlight.js/lib/languages/shell'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import typescript from 'highlight.js/lib/languages/typescript'

type LanguageFn = Parameters<typeof defaultHljs.registerLanguage>[1]

const hljs: typeof defaultHljs = hljsCore as typeof defaultHljs

const LANGUAGES: [string, LanguageFn][] = [
  ['bash', bash],
  ['cpp', cpp],
  ['java', java],
  ['javascript', javascript],
  ['json', json],
  ['python', python],
  ['shell', shell],
  ['typescript', typescript],
]

LANGUAGES.forEach(([name, fn]) => hljs.registerLanguage(name, fn))

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
