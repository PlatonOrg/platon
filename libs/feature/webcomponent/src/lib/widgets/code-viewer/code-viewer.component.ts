import { ChangeDetectionStrategy, Component, Injector, Input, OnInit, inject } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { CodeViewerComponentDefinition, type CodeViewerState } from './code-viewer'
import { NgeMonacoModule } from '@cisstech/nge/monaco'

import { BaseModule } from '../../shared/components/base/base.module'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'

@Component({
  selector: 'wc-code-viewer',
  templateUrl: 'code-viewer.component.html',
  styleUrls: ['code-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, NgeMonacoModule, NgeMarkdownModule],
})
@WebComponent(CodeViewerComponentDefinition)
export class CodeViewerComponent implements WebComponentHooks<CodeViewerState>, OnInit {
  readonly injector = inject(Injector)

  @Input() state!: CodeViewerState

  show: Set<number> = new Set()

  data = '```'
  lineNumbers: number[] = []

  ngOnInit() {
    this.data += this.state.language + ' highlights=' + '"' + this.state.highlights + '"\n'
    this.data += this.state.code
    this.data += '\n```\n'

    /* line number */
    const lineCount = this.state.code.split('\n').length
    this.lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)
    if (this.state.lines != '') {
      const pas = Number(this.state.lines)
      if (!Number.isNaN(pas) && pas > 0) {
        for (let i = 0; i <= lineCount; i += pas) {
          this.show.add(i)
        }
      }
    }
  }
}
