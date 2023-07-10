import { Injectable } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Route,
  Router,
  RouterStateSnapshot,
} from '@angular/router'
import { UserRoles } from '@platon/core/common'
import { AuthService } from '../api/auth.service'

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private readonly router: Router, private readonly authService: AuthService) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const user = await this.authService.ready()
    if (user) {
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

  private redirect403() {
    this.router.navigate(['/403'], {
      skipLocationChange: true,
    })
  }
}

export const withAuthGuard = (
  route: Route,
  roles?: (UserRoles | keyof typeof UserRoles)[]
): Route => ({
  ...route,
  canActivate: [...(route.canActivate || []), AuthGuard],
  data: { ...(route.data || {}), roles },
})
