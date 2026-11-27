import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, forwardRef, inject } from '@angular/core'

import { MatButtonModule } from '@angular/material/button'

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { ActivatedRoute, Router } from '@angular/router'
import { CasService } from '../../api/cas.service'
import { NG_VALUE_ACCESSOR } from '@angular/forms'

@Component({
  selector: 'cas-sign-in',
  templateUrl: './cas-sign-in.component.html',
  styleUrls: ['./cas-sign-in.component.scss'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CasSignInComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatProgressSpinnerModule],
})
export class CasSignInComponent implements OnInit {
  private readonly router = inject(Router)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly casService = inject(CasService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected connecting = false
  protected cases: string[] = []

  ngOnInit(): void {
    this.casService.listCas().subscribe((cases) => {
      this.cases = cases.resources
      this.changeDetectorRef.markForCheck()
    })
  }

  signInWithCas(casname: string): void {
    this.connecting = true

    let next = ''
    if (this.activatedRoute.snapshot.queryParams['next'])
      next = '?next=' + this.activatedRoute.snapshot.queryParams['next']

    window.location.href = '/api/v1/cas/login/' + casname + next
  }
}
