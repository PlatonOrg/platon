import { Injectable, inject } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Route,
  Router,
  RouterStateSnapshot,
} from '@angular/router'
import { UserRoles } from '@platon/core/common'
import { filter, firstValueFrom } from 'rxjs'
import { AuthService } from '../api/auth.service'

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const user = await this.authService.ready()
    if (user) {
      if (!user.active) {
        this.redirect403('disabled')
        return false
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roles: UserRoles[] = (route.data as any).roles || []
      if (!roles.length) {
        return true
      }

      if (!roles.includes(user.role)) {
        this.redirect403()
        return false
      }

      return true
    }

    return this.router.createUrlTree(['/login'], {
      queryParams: { next: state.url },
      queryParamsHandling: 'merge',
    })
  }

  /**
   * Sends the user to the login page if the current page requires an authenticated user: it could not load
   * anything anymore. They come back to it after signing in. Public pages are left as is.
   */
  async redirectIfProtected(): Promise<void> {
    // A guard running in the navigation in progress may already be redirecting to the login page, with the right url.
    await this.navigationSettled()

    if (this.isProtected(this.router.routerState.snapshot.root)) {
      await this.router.navigate(['/login'], { queryParams: { next: this.router.url }, replaceUrl: true })
    }
  }

  private isProtected(route: ActivatedRouteSnapshot): boolean {
    return !!route.routeConfig?.canActivate?.includes(AuthGuard) || route.children.some((c) => this.isProtected(c))
  }

  private async navigationSettled(): Promise<void> {
    while (this.router.currentNavigation()) {
      await firstValueFrom(
        this.router.events.pipe(
          filter(
            (event) =>
              event instanceof NavigationEnd ||
              event instanceof NavigationCancel ||
              event instanceof NavigationError ||
              event instanceof NavigationSkipped
          )
        )
      )
      // The router clears the navigation, or starts the one it is redirected to, right after emitting these events.
      await new Promise((resolve) => setTimeout(resolve))
    }
  }

  private redirect403(reason?: string) {
    this.router
      .navigate(['/403'], {
        skipLocationChange: true,
        queryParams: { reason },
      })
      .catch(console.error)
  }
}

export const withAuthGuard = (route: Route, roles?: (UserRoles | keyof typeof UserRoles)[]): Route => ({
  ...route,
  canActivate: [...(route.canActivate || []), AuthGuard],
  data: { ...(route.data || {}), roles },
})
