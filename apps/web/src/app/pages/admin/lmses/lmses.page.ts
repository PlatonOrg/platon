import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTabsModule } from 'ng-zorro-antd/tabs'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { firstValueFrom } from 'rxjs'

import {
  LmsCreateDrawerComponent,
  LmsDrawerComponent,
  LmsSearchBarComponent,
  LmsTableComponent,
  LTIService,
  LtiPlatformDrawerComponent,
  LtiPlatformTableComponent,
} from '@platon/feature/lti/browser'
import { Lms, LmsFilters, LtiPlatform, LtiToolConfig } from '@platon/feature/lti/common'

@Component({
  selector: 'app-admin-lmses',
  templateUrl: './lmses.page.html',
  styleUrls: ['./lmses.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzIconModule,
    NzButtonModule,
    NzTabsModule,
    NzTooltipModule,
    LmsTableComponent,
    LtiPlatformDrawerComponent,
    LtiPlatformTableComponent,
    LmsDrawerComponent,
    LmsSearchBarComponent,
    LmsCreateDrawerComponent,
  ],
})
export class AdminLmsesPage implements OnInit {
  private readonly ltiService = inject(LTIService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected platforms: LtiPlatform[] = []
  protected loadingPlatforms = true
  protected toolConfig?: LtiToolConfig
  protected lmses: Lms[] = []
  protected filters: LmsFilters = { limit: 10 }
  protected insert(lms: Lms) {
    this.lmses = [lms, ...this.lmses]
  }

  protected onUpdateLms(lms: Lms): void {
    this.lmses = this.lmses.map((l) => (l.id === lms.id ? lms : l))
  }

  protected onDeleteLms(lms: Lms): void {
    this.lmses = this.lmses.filter((l) => l.id !== lms.id)
  }

  async ngOnInit(): Promise<void> {
    await this.loadPlatforms()
    try {
      this.toolConfig = await firstValueFrom(this.ltiService.getLtiToolConfig())
    } catch {
      this.toolConfig = undefined
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async loadPlatforms(): Promise<void> {
    this.loadingPlatforms = true
    try {
      this.platforms = (await firstValueFrom(this.ltiService.searchLtiPlatforms())).resources
    } catch {
      this.platforms = []
    } finally {
      this.loadingPlatforms = false
      this.changeDetectorRef.markForCheck()
    }
  }
}
