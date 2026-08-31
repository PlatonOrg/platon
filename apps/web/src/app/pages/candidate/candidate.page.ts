import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { TestsService } from '@platon/feature/tests/browser'
import { NzSpinModule } from 'ng-zorro-antd/spin'

@Component({
  selector: 'app-candidate',
  templateUrl: './candidate.page.html',
  styleUrls: ['./candidate.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, NzSpinModule],
})
export class TestCandidatePage {
  private route = inject(ActivatedRoute)
  private readonly testsService = inject(TestsService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  invitationId?: string

  error?: string

  constructor() {
    this.route.queryParams.subscribe(async (params) => {
      this.invitationId = params['invitationId']
      if (this.invitationId) {
        const success = await this.testsService.signInWithInvitation(this.invitationId)
        if (!success) {
          this.error = "L'invitation n'est pas valide ou a expiré."
          this.changeDetectorRef.markForCheck()
        }
      }
    })
  }
}
