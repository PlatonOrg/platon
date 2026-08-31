import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { CorrectionTableComponent, ResultService } from '@platon/feature/result/browser'
import { ActivityCorrectionSummary } from '@platon/feature/result/common'
import { NzEmptyModule } from 'ng-zorro-antd/empty'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { firstValueFrom } from 'rxjs'

@Component({
  selector: 'app-corrections-availables',
  templateUrl: './availables.page.html',
  styleUrls: ['./availables.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzEmptyModule, CorrectionTableComponent, NzSpinModule],
})
export class CorrectionsAvailablesPage implements OnInit {
  private readonly resultService = inject(ResultService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected corrections: ActivityCorrectionSummary[] = []
  protected loading = true

  async ngOnInit(): Promise<void> {
    const response = await firstValueFrom(this.resultService.listAvailableCorrections())
    this.corrections = response.resources
    this.changeDetectorRef.markForCheck()
    this.loading = false
  }
}
