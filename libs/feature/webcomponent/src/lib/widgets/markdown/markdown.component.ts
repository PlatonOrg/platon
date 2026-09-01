import { ChangeDetectionStrategy, Component, Injector, Input, inject } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { MarkdownComponentDefinition, type MarkdownState } from './markdown'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'
import { BaseModule } from '../../shared/components/base/base.module'

@Component({
  selector: 'wc-markdown',
  templateUrl: 'markdown.component.html',
  styleUrls: ['markdown.component.scss'],
  imports: [BaseModule, NgeMarkdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(MarkdownComponentDefinition)
export class MarkdownComponent implements WebComponentHooks<MarkdownState> {
  readonly injector = inject(Injector)

  @Input() state!: MarkdownState
}
