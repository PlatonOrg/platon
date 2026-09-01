import { ChangeDetectionStrategy, Component, Injector, Input, inject } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { FeedbackComponentDefinition, type FeedbackState } from './feedback'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'

import { NzAlertModule } from 'ng-zorro-antd/alert'
import { NzIconModule } from 'ng-zorro-antd/icon'

import { BaseModule } from '../../shared/components/base/base.module'
@Component({
  selector: 'wc-feedback',
  templateUrl: 'feedback.component.html',
  styleUrls: ['feedback.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule, NzAlertModule, NzIconModule, NgeMarkdownModule],
})
@WebComponent(FeedbackComponentDefinition)
export class FeedbackComponent implements WebComponentHooks<FeedbackState> {
  readonly injector = inject(Injector)

  @Input() state!: FeedbackState
}
