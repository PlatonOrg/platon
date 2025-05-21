import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { FoldableFeedbackComponentDefinition, FoldableFeedbackState } from './foldable-feedback'

@Component({
  selector: 'wc-foldable-feedback',
  templateUrl: 'foldable-feedback.component.html',
  styleUrls: ['foldable-feedback.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(FoldableFeedbackComponentDefinition)
export class FoldableFeedbackComponent implements WebComponentHooks<FoldableFeedbackState> {
  @Input() state!: FoldableFeedbackState

  constructor(readonly injector: Injector) {}

  formatTextHtml(text: string): string {
    if (!text) return ''
    return text
      .replace(/ /g, '<span class="invisible space">·</span>')
      .replace(/\t/g, '<span class="invisible tab">⟼</span>')
      .replace(/\n/g, '<span class="invisible newline">↲</span><br>')
  }

  onClick(index: string) {
    const indexArray = index.split('-')
    const content = this.state.content
    let currentContent = content[parseInt(indexArray[0])]
    for (let i = 1; i < indexArray.length; i++) {
      currentContent = currentContent.feedbacks![parseInt(indexArray[i])]
    }
    currentContent.display = !currentContent.display
  }
}
