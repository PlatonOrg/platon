import { Injectable, OnDestroy, inject } from '@angular/core'
import { MatIconRegistry } from '@angular/material/icon'
import { ActivatedRoute, Router } from '@angular/router'
import { NzIconService } from 'ng-zorro-antd/icon'
import { Subscription } from 'rxjs'
import { AuthService } from './auth'
import { ThemeService } from './services/theme.service'

@Injectable({ providedIn: 'root' })
export class CoreService implements OnDestroy {
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly themeService = inject(ThemeService)
  private readonly iconRegistry = inject(MatIconRegistry)
  private readonly nzIconService = inject(NzIconService)
  private readonly activatedRoute = inject(ActivatedRoute)

  private readonly subscriptions: Subscription[] = []

  init() {
    this.themeService.loadTheme()
    this.nzIconService.changeAssetsSource('assets/vendors/@ant-design')
    this.iconRegistry.setDefaultFontSetClass('material-icons-outlined')

    this.subscriptions.push(
      this.activatedRoute.queryParamMap.subscribe(async (queryParams) => {
        if (queryParams.has('lti-launch')) {
          const next = queryParams.get('next')
          const accessToken = queryParams.get('access-token') as string
          const refreshToken = queryParams.get('refresh-token') as string
          await this.authService.signInWithToken({ accessToken, refreshToken })
          this.router.navigateByUrl(next || '/dashboard', { replaceUrl: true })
        }
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe())
  }
}
