import { ChangeDetectionStrategy, Component, Injector, Input, inject } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import {
  CodeViewerComponentDefinition,
  type CodeViewerState,
  codeViewerLanguageSupported,
  codeViewerMarkdown,
  codeViewerWarnings,
} from './code-viewer'
import { NgeMonacoLoaderService, NgeMonacoModule } from '@cisstech/nge/monaco'

import { BaseModule } from '../../shared/components/base/base.module'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'

@Component({
  selector: 'wc-code-viewer',
  templateUrl: 'code-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, NgeMonacoModule, NgeMarkdownModule],
})
@WebComponent(CodeViewerComponentDefinition)
export class CodeViewerComponent implements WebComponentHooks<CodeViewerState> {
  readonly injector = inject(Injector)
  private readonly monacoLoader = inject(NgeMonacoLoaderService)

  @Input() state!: CodeViewerState

  /** The code as a markdown block: the colorizer writes the line numbers next to each line of code. */
  protected data = ''

  onChangeState() {
    this.data = codeViewerMarkdown(this.state)
    // The invalid properties are ignored
    codeViewerWarnings(this.state).forEach((warning) => console.warn(`wc-code-viewer: ${warning}`))
    void this.checkLanguage(this.state.language)
  }

  /** Warns when Monaco can't colorize the language the code is then displayed as plain text. */
  private async checkLanguage(language: string) {
    await this.monacoLoader.loadAsync()
    // The state may have changed while Monaco was loading.
    if (language !== this.state.language || codeViewerLanguageSupported(language, monaco.languages.getLanguages())) {
      return
    }
    console.warn(`wc-code-viewer: Langage « ${language} » non pris en charge : le code est affiché sans coloration.`)
  }
}
