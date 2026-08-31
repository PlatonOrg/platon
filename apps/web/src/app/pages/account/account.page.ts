import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterModule } from '@angular/router'

import { MatIconModule } from '@angular/material/icon'

import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb'

import { UiLayoutTabsComponent, UiLayoutTabDirective } from '@platon/shared/ui'

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, MatIconModule, NzBreadCrumbModule, UiLayoutTabsComponent, UiLayoutTabDirective],
})
export class AccountPage {}
