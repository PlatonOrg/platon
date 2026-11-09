import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router, Routes } from '@angular/router'
import { AuthService } from '../api/auth.service'
import { AuthGuard, withAuthGuard } from './auth.guard'

@Component({ template: '' })
class PageComponent {}

const routes: Routes = [
  { path: 'login', component: PageComponent },
  { path: 'public', component: PageComponent },
  withAuthGuard({ path: 'protected', component: PageComponent }),
  { path: 'nested', children: [withAuthGuard({ path: 'protected', component: PageComponent })] },
]

describe('AuthGuard', () => {
  const user = { id: 'user-1', username: 'testuser', active: true }

  let guard: AuthGuard
  let router: Router
  let authService: { ready: jest.Mock }

  beforeEach(() => {
    authService = { ready: jest.fn().mockResolvedValue(user) }
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: AuthService, useValue: authService }],
    })
    guard = TestBed.inject(AuthGuard)
    router = TestBed.inject(Router)
  })

  describe('redirectIfProtected', () => {
    it("devrait rediriger vers la page de connexion depuis une page protégée, en conservant l'url", async () => {
      await router.navigateByUrl('/protected?tab=1')

      await guard.redirectIfProtected()

      expect(router.url).toBe('/login?next=%2Fprotected%3Ftab%3D1')
    })

    it('devrait rediriger depuis une page protégée imbriquée', async () => {
      await router.navigateByUrl('/nested/protected')

      await guard.redirectIfProtected()

      expect(router.url).toBe('/login?next=%2Fnested%2Fprotected')
    })

    it('ne devrait pas rediriger depuis une page publique', async () => {
      await router.navigateByUrl('/public')

      await guard.redirectIfProtected()

      expect(router.url).toBe('/public')
    })

    it('ne devrait pas rediriger avant la première navigation', async () => {
      await guard.redirectIfProtected()

      expect(router.url).toBe('/')
    })

    it('devrait laisser le guard de la navigation en cours rediriger vers la page demandée', async () => {
      await router.navigateByUrl('/protected')

      // The session ends while the guard of the next page is waiting for the user.
      let resolveUser!: (user: undefined) => void
      authService.ready.mockReturnValue(new Promise((resolve) => (resolveUser = resolve)))
      const navigation = router.navigateByUrl('/nested/protected')
      await new Promise((resolve) => setTimeout(resolve))

      const redirect = guard.redirectIfProtected()
      resolveUser(undefined)
      await Promise.all([navigation, redirect])

      expect(router.url).toBe('/login?next=%2Fnested%2Fprotected')
    })

    it('devrait rediriger une fois la navigation en cours terminée si aucun guard ne le fait', async () => {
      await router.navigateByUrl('/public')

      let resolveUser!: (value: typeof user) => void
      authService.ready.mockReturnValue(new Promise((resolve) => (resolveUser = resolve)))
      const navigation = router.navigateByUrl('/protected')
      await new Promise((resolve) => setTimeout(resolve))

      const redirect = guard.redirectIfProtected()
      resolveUser(user)
      await Promise.all([navigation, redirect])

      expect(router.url).toBe('/login?next=%2Fprotected')
    })
  })
})
