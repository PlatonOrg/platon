import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

import { CasCreateDrawerComponent, CasSearchBarComponent, CasTableComponent } from '@platon/feature/cas/browser'
import { Cas } from '@platon/feature/cas/common'
import { LTIService } from '@platon/feature/lti/browser'
import { Lms } from '@platon/feature/lti/common'

@Component({
  selector: 'app-admin-cases',
  templateUrl: './cases.page.html',
  styleUrls: ['./cases.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzIconModule,
    NzButtonModule,
    NzTooltipModule,
    CasTableComponent,
    CasSearchBarComponent,
    CasCreateDrawerComponent,
  ],
})
export class AdminCasesPage implements OnInit {
  private readonly ltiService = inject(LTIService)
  private readonly changeDectectorRef = inject(ChangeDetectorRef)

  protected cases: Cas[] = []
  lmses: Lms[] = []

  protected insert(cas: Cas) {
    this.cases = [cas, ...this.cases]
  }

  ngOnInit() {
    this.ltiService.searchLms().subscribe((lmses) => {
      this.lmses = lmses.resources
      this.changeDectectorRef.markForCheck()
    })
  }
}
