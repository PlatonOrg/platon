import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { TestsService } from '@platon/feature/tests/browser'
import { NzSpinModule } from 'ng-zorro-antd/spin'

@Component({
  standalone: true,
  selector: 'app-candidate',
  templateUrl: './candidate.page.html',
  styleUrls: ['./candidate.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, NzSpinModule],
})
export class TestCandidatePage {
  invitationId?: string

  error?: string

  constructor(
    private route: ActivatedRoute,
    private readonly testsService: TestsService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
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
