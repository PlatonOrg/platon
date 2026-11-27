import { Pipe, PipeTransform, SecurityContext, inject } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'

/** syntaxic color for json file preview */
@Pipe({ name: 'jsonSyntaxHighlight', standalone: true })
export class JsonSyntaxHighlightPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer)

  transform(json: string): SafeHtml {
    const highlighted = json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'number'
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'key' : 'string'
        } else if (/true|false/.test(match)) {
          cls = 'boolean'
        } else if (/null/.test(match)) {
          cls = 'null'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
    return this.sanitizer.sanitize(SecurityContext.HTML, highlighted) || ''
  }
}
