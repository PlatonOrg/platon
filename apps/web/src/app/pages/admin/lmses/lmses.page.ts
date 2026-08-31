import { ChangeDetectionStrategy, Component } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

import {
  LmsCreateDrawerComponent,
  LmsDrawerComponent,
  LmsSearchBarComponent,
  LmsTableComponent,
} from '@platon/feature/lti/browser'
import { Lms, LmsFilters } from '@platon/feature/lti/common'

@Component({
  selector: 'app-admin-lmses',
  templateUrl: './lmses.page.html',
  styleUrls: ['./lmses.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzIconModule,
    NzButtonModule,
    NzTooltipModule,
    LmsTableComponent,
    LmsDrawerComponent,
    LmsSearchBarComponent,
    LmsCreateDrawerComponent,
  ],
})
export class AdminLmsesPage {
  protected lmses: Lms[] = []
  protected filters: LmsFilters = { limit: 10 }
  protected insert(lms: Lms) {
    this.lmses = [lms, ...this.lmses]
  }

  protected onUpdateLms(lms: Lms): void {
    this.lmses = this.lmses.map((l) => (l.id === lms.id ? lms : l))
  }
}
