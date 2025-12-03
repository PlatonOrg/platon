import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { CodeViewerComponentDefinition, CodeViewerState } from './code-viewer'
import { generate } from 'ng-zorro-antd/core/color'
import { number } from 'echarts'

@Component({
  selector: 'wc-code-viewer',
  templateUrl: 'code-viewer.component.html',
  styleUrls: ['code-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(CodeViewerComponentDefinition)
export class CodeViewerComponent implements WebComponentHooks<CodeViewerState> {
  @Input() state!: CodeViewerState

  show: Set<number> = new Set()

  constructor(readonly injector: Injector) {}

  data = "```"
  lineNumbers : number[] = []

  ngOnInit() {

    this.data += this.state.language + " highlights="+ "\""+ this.state.highlights +"\"\n"
    this.data += this.state.code
    this.data += "\n```\n"


    /* line number */
    const lineCount = this.state.code.split('\n').length
    this.lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)
    if (this.state.lines != "") {
      let pas = Number(this.state.lines)
      if (!Number.isNaN(pas) && pas > 0) {
        for(let i = 0; i <= lineCount; i += pas){
          this.show.add(i);
        }
      }
    }

  }
}
