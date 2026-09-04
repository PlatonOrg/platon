import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterModule } from '@angular/router'
import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb'

import { NzCalendarModule } from 'ng-zorro-antd/calendar'

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.page.html',
  styleUrls: ['./agenda.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, NzBreadCrumbModule, NzBadgeModule, NzCalendarModule],
})
export class AgendaPage {}
