import { Injectable, inject } from '@angular/core'
import { NgeMonacoLoaderService } from '@cisstech/nge/monaco'
import { NgeMonacoThemeService } from '@cisstech/nge/monaco'

@Injectable({ providedIn: 'root' })
export class ThomasColorizerService {
  private readonly loader = inject(NgeMonacoLoaderService)
  private readonly theming = inject(NgeMonacoThemeService)

  async colorizeElement(options: NgeMonacoColorizeOptions) {
    await this.loader.loadAsync()
    if (options.theme) {
      await this.theming.defineTheme(options.theme)
    }

    const { element } = options

    element.innerHTML = this.escapeHtml(options.code || '')
    element.style.padding = '4px'
    element.style.display = 'block'

    const pre = element.parentElement
    if (pre?.tagName === 'PRE') {
      if (!pre.classList.contains('monaco-editor')) {
        pre.classList.add('monaco-editor')
      }
      if (!pre.classList.contains('monaco-editor-background')) {
        pre.classList.add('monaco-editor-background')
      }
    }

    element.className = ''

    const languages = monaco.languages.getLanguages()
    const language = languages.find((e) => {
      return e.id === options.language || e.aliases?.find((a) => a === options.language)
    })?.id

    await monaco.editor.colorizeElement(element, {
      mimeType: language || 'plaintext',
      theme: options.theme || this.theming.theme?.themeName || 'vs',
    })

    this.highlightLines(options)
    this.showLineNumbers(options)

    this.addFileTab(options)
  }

  private escapeHtml(input: string): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: any = {
      '<': '&lt;',
      '>': '&gt;',
    }
    return input.replace(/[<>]/g, (tag) => map[tag] || tag)
  }

  private highlightLines(options: NgeMonacoColorizeOptions): void {
    if (!options.highlights) {
      return
    }

    const { element } = options

    const linesToHighlight = this.lineNumbersFromString(options.highlights.toString())

    let newLine = true
    let lineNumber = 1
    element.childNodes.forEach((e) => {
      const node = e as HTMLElement
      if (newLine) {
        const div = document.createElement('div')
        div.style.height = '18px'
        if (linesToHighlight.includes(lineNumber)) {
          div.classList.add('rangeHighlight')
          div.classList.add('selected-text')
        }
        element.insertBefore(div, node)
        element.removeChild(node)
        div.appendChild(node)
        newLine = false
      } else if (node.tagName === 'BR') {
        lineNumber++
        newLine = true
      }
    })
    Array.from(element.getElementsByTagName('br')).forEach((node) => node.remove())
  }

  private showLineNumbers(options: NgeMonacoColorizeOptions): void {
    if (!options.lines) {
      return
    }

    const { element } = options
    const lines = this.lineNumbersFromString(options.lines.toString())
    const length = (options.code || '').split('\n').length
    if (lines.length === 1) {
      for (let i = lines[0] + 1; i <= length; i++) {
        lines.push(i)
      }
    }

    const side = ['<div style="padding:0  12px; text-align: right;">']
    for (let i = 0; i < length; i++) {
      let num = ''
      if (lines.includes(i + 1)) {
        num = '' + (i + 1)
      }
      side.push(`<div class="line-numbers" style="height: 18px">${num}</div>`)
    }
    side.push('</div>')

    element.style.display = 'flex'
    element.innerHTML = `
            ${side.join('')}
            <div style="flex: 1;">${element.innerHTML}</div>
        `
  }

  private lineNumbersFromString(input: string): number[] {
    const tokens = (input || '').trim().split(' ')
    const lines: number[] = []
    for (const token of tokens) {
      if (token.includes('-')) {
        const range = token.split('-')
        const start = Number.parseInt(range[0], 10)
        const end = Number.parseInt(range[1], 10)
        if (start && end) {
          for (let i = start; i <= end; i++) {
            if (!lines.includes(i)) {
              lines.push(i)
            }
          }
        }
      } else {
        const n = Number.parseInt(token, 10)
        if (n) {
          lines.push(n)
        }
      }
    }
    return lines
  }

  private addFileTab(options: NgeMonacoColorizeOptions): void {
    const { element, code, filename } = options
    const container = element.parentElement as HTMLElement

    // Force remove padding from pre element
    if (container) {
      container.style.padding = '0'
      container.style.margin = '0'
      container.style.width = '100%'
    }

    // Create tab container that takes full width
    const tabContainer = document.createElement('div')
    tabContainer.style.display = 'flex'
    tabContainer.style.justifyContent = 'space-between'
    tabContainer.style.alignItems = 'center'
    tabContainer.style.padding = '0px'
    tabContainer.style.backgroundColor = 'var(--vscode-editor-background, #fafafa)'
    tabContainer.style.fontSize = '14px'
    tabContainer.style.boxSizing = 'border-box'
    tabContainer.style.fontFamily =
      'var(--monaco-monospace-font, "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace)'
    // make it only visible when hovering the container
    tabContainer.style.width = '100%'
    tabContainer.style.height = '0px'
    tabContainer.style.zIndex = '1'
    tabContainer.style.opacity = '0'
    if (container) {
      container.style.position = 'relative'
      // Show tab on hover
      container.addEventListener('mouseover', () => {
        tabContainer.style.opacity = '1'
      })
      container.addEventListener('mouseout', () => {
        tabContainer.style.opacity = '0'
      })
    }
    tabContainer.style.transition = 'opacity 0.3s'

    // Add filename on left side
    const filenameSpan = document.createElement('span')
    filenameSpan.textContent = filename || ''
    filenameSpan.style.overflow = 'hidden'
    filenameSpan.style.textOverflow = 'ellipsis'
    filenameSpan.style.whiteSpace = 'nowrap'
    filenameSpan.style.fontWeight = '500'
    filenameSpan.style.fontSize = '.75rem'
    filenameSpan.style.color = 'var(--vscode-descriptionForeground, rgba(0, 0, 0, 0.85))'
    filenameSpan.title = filename || ''

    // Add file actions container (right side)
    const fileActions = document.createElement('div')
    fileActions.className = 'file-actions'
    fileActions.style.position = 'absolute'
    fileActions.style.right = '4px'
    fileActions.style.top = '4px'
    fileActions.style.display = 'flex'
    fileActions.style.alignItems = 'center'
    fileActions.style.gap = '10px'

    // Create copy button with icon
    const copyButton = document.createElement('button')
    copyButton.style.border = 'none'
    copyButton.style.background = 'none'
    copyButton.style.cursor = 'pointer'
    copyButton.style.color = 'var(--vscode-editor-foreground, rgba(0, 0, 0, 0.85))'
    copyButton.style.display = 'flex'
    copyButton.style.alignItems = 'center'
    copyButton.style.justifyContent = 'center'
    copyButton.style.width = '16px'
    copyButton.style.height = '16px'
    copyButton.style.padding = '0'
    copyButton.style.borderRadius = '4px'
    copyButton.style.transition = 'all 0.3s'
    copyButton.title = 'Copy code to clipboard'

    // Hover effect
    copyButton.addEventListener('mouseover', () => {
      copyButton.style.color = '#1890ff'
      copyButton.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'
    })
    copyButton.addEventListener('mouseout', () => {
      copyButton.style.color = 'var(--vscode-editor-foreground, rgba(0, 0, 0, 0.85))'
      copyButton.style.backgroundColor = 'transparent'
    })

    // Copy functionality
    copyButton.addEventListener('click', async (event) => {
      // Prevent default action and event bubbling
      event.preventDefault()
      event.stopPropagation()

      try {
        await navigator.clipboard.writeText(code || '')

        // Show feedback
        copyButton.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>`
        copyButton.style.color = '#52c41a'

        setTimeout(() => {
          // Use requestAnimationFrame to ensure smooth transition
          requestAnimationFrame(() => {
            copyButton.innerHTML = copySvg
            copyButton.style.color = 'var(--vscode-editor-foreground, rgba(0, 0, 0, 0.85))'
          })
        }, 2000)
      } catch (err) {
        console.error('Failed to copy code:', err)
      }

      // Return false to ensure no further action
      return false
    })

    // Create download button with icon
    // const downloadButton = document.createElement('button')
    // downloadButton.style.border = 'none'
    // downloadButton.style.background = 'none'
    // downloadButton.style.cursor = 'pointer'
    // downloadButton.style.color = 'var(--vscode-editor-foreground, rgba(0, 0, 0, 0.85))'
    // downloadButton.style.display = 'flex'
    // downloadButton.style.alignItems = 'center'
    // downloadButton.style.justifyContent = 'center'
    // downloadButton.style.width = '16px'
    // downloadButton.style.height = '16px'
    // downloadButton.style.padding = '0'
    // downloadButton.style.borderRadius = '4px'
    // downloadButton.style.transition = 'all 0.3s'
    // downloadButton.title = 'Download code as file'

    // // Hover effect
    // downloadButton.addEventListener('mouseover', () => {
    //   downloadButton.style.color = '#1890ff'
    //   downloadButton.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'
    // })
    // downloadButton.addEventListener('mouseout', () => {
    //   downloadButton.style.color = 'var(--vscode-editor-foreground, rgba(0, 0, 0, 0.85))'
    //   downloadButton.style.backgroundColor = 'transparent'
    // })

    // // Download functionality
    // downloadButton.addEventListener('click', (event) => {
    //   // Prevent default action and event bubbling
    //   event.preventDefault()
    //   event.stopPropagation()

    //   // Save original content
    //   const originalInnerHTML = downloadButton.innerHTML

    //   try {
    //     const blob = new Blob([code || ''], { type: 'text/plain' })
    //     const url = URL.createObjectURL(blob)
    //     const a = document.createElement('a')
    //     a.href = url
    //     a.download = filename || 'code.txt'
    //     a.style.display = 'none'
    //     a.setAttribute('data-no-scroll', 'true') // Mark as no-scroll

    //     // Execute download
    //     document.body.appendChild(a)
    //     a.click()
    //     document.body.removeChild(a)

    //     // Show success feedback similar to copy button
    //     downloadButton.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>`
    //     downloadButton.style.color = '#52c41a'

    //     // Reset button after timeout
    //     setTimeout(() => {
    //       // Use requestAnimationFrame for smoother transition
    //       requestAnimationFrame(() => {
    //         downloadButton.innerHTML = downloadSvg
    //         downloadButton.style.color = 'var(--vscode-editor-foreground, rgba(0, 0, 0, 0.85))'
    //         URL.revokeObjectURL(url) // Clean up URL object
    //       })
    //     }, 2000)
    //   } catch (err) {
    //     console.error('Failed to download code:', err)
    //     downloadButton.innerHTML = originalInnerHTML
    //   }

    //   // Return false to ensure no further action
    //   return false
    // })

    // Copy icon SVG
    const copySvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`

    // Download icon SVG
    // const downloadSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`

    copyButton.innerHTML = copySvg
    // downloadButton.innerHTML = downloadSvg

    // Add buttons to actions container
    fileActions.appendChild(copyButton)
    // fileActions.appendChild(downloadButton)

    // Build the tab
    tabContainer.appendChild(filenameSpan)
    tabContainer.appendChild(fileActions)

    // Insert tab before the editor content
    if (container) {
      container.insertBefore(tabContainer, element)

      // Add some styling to the container for better appearance
      container.style.border = '1px solid #e8e8e8'
      container.style.borderRadius = '2px'
      container.style.overflow = 'hidden'
      container.style.marginBottom = '16px'
      container.style.padding = '0'

      // Add inner padding to code content
      element.style.padding = '16px'
    } else {
      // If no container, wrap the element with one
      const wrapper = document.createElement('div')
      wrapper.style.border = '1px solid #e8e8e8'
      wrapper.style.borderRadius = '2px'
      wrapper.style.overflow = 'hidden'
      wrapper.style.marginBottom = '16px'
      wrapper.style.padding = '0'
      wrapper.style.width = '100%'

      const parent = element.parentElement
      if (parent) {
        parent.insertBefore(wrapper, element)
        wrapper.appendChild(tabContainer)
        wrapper.appendChild(element)

        // Add inner padding to code content
        element.style.padding = '16px'
      }
    }
  }
}

export interface NgeMonacoColorizeOptions {
  /** Element to colorize (&lt;code&gt; element). */
  element: HTMLElement

  /** Code to highlight */
  code: string

  /** Theme to use for the syntax highlighting  */
  theme?: string

  /** Target language (default plaintext). */
  language?: string

  /**
   * Start line number or a space separated list of line numbers to show.
   *
   * Example:
   *
   * *Show all line numbers starting 1*
   *
   * `"1"`
   *
   * *Show all line numbers from 1 to 4*
   *
   * `"1-4"`
   *
   * *Show lines 2 4 5 6 7 9*
   *
   * `"2 4-7 9"`
   */
  lines?: string | number

  /**
   * A space separated list of line numbers to highlight.
   *
   * Example:
   *
   * *Highlight line 1*
   *
   * `"1"`
   *
   * *Highlight all lines from 1 to 4*
   *
   * `"1-4"`
   *
   * *Highlight lines 2 4 5 6 7 9*
   *
   * `"2 4-7 9"`
   */
  highlights?: string | number

  /**
   * Optional filename to display in the tab header.
   */
  filename?: string
}
