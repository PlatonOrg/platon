import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'

import { RouterModule } from '@angular/router'
import { UiError403Component, UiError404Component, UiError500Component } from '../../error'
import { LayoutState } from '../layout'

@Component({
  selector: 'ui-layout-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, NzSkeletonModule, UiError403Component, UiError404Component, UiError500Component],
})
export class UiLayoutBlockComponent {
  @Input() state: LayoutState = 'READY'
}
