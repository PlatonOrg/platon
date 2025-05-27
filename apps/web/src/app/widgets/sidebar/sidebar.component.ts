import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { Router, RouterModule } from '@angular/router'
import { AuthService } from '@platon/core/browser'
import { User, UserRoles, isTeacherRole } from '@platon/core/common'
import { SidebarTutorialService } from 'tuto'

type NavLink = {
  url?: string | null
  icon: string
  title: string
  external?: boolean
  children?: NavLink[]
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MatIconModule],
})
export class SidebarComponent implements OnInit {
  protected readonly topLinks: NavLink[] = []
  protected readonly bottomLinks: NavLink[] = []
  protected readonly expandedLinks = new Set<string>()
  protected readonly asNavLink = (o: unknown) => o as NavLink

  protected user?: User

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly sidebarTutorialService: SidebarTutorialService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.user = await this.authService.ready()
    if (!this.user) {
      return
    }

    this.topLinks.push(
      {
        url: '/dashboard',
        icon: 'dashboard',
        title: 'Tableau de bord',
      },
      // {
      //   url: '/agenda',
      //   icon: 'calendar_month',
      //   title: 'Agenda',
      // },
      {
        url: '/courses',
        icon: 'local_library',
        title: 'Cours',
      },
      {
        url: '/corrections',
        icon: 'rate_review',
        title: 'Corrections',
      },

      ...(isTeacherRole(this.user.role)
        ? [
            {
              url: '/resources',
              icon: 'work',
              title: 'Espace de travail',
            },
          ]
        : []),
      ...(this.user.role === UserRoles.admin
        ? [
            {
              url: '/admin',
              icon: 'admin_panel_settings',
              title: 'Administration',
            },
          ]
        : [])
    )

    this.bottomLinks.push(
      {
        url: '/account/about-me',
        icon: 'account_circle',
        title: 'Mon compte',
      },
      ...(isTeacherRole(this.user.role)
        ? [
            {
              url: '/docs',
              icon: 'help',
              title: 'Documentation',
              external: true,
            },
          ]
        : [])
    )
    this.checkFirstVisit()
    this.changeDetectorRef.markForCheck()
  }

  protected toggleLink(link: NavLink): void {
    if (link.url) {
      return
    }
    if (this.expandedLinks.has(link.title)) {
      this.expandedLinks.delete(link.title)
    } else {
      this.expandedLinks.add(link.title)
    }
  }

  // Pour le tutoriel
  protected isFirstVisit = true

  /**
   * Vérifie si c'est la première visite de l'utilisateur
   */
  private checkFirstVisit(): void {
    // Si c'est la première visite, démarrer le tutoriel automatiquement après un délai
    if (this.isFirstVisit && this.user) {
      setTimeout(() => {
        this.startSidebarTutorial()
      }, 1500) // Délai de 1.5 secondes pour permettre à la page de se charger
    }
  }

  /**
   * Démarre le tutoriel complet de la sidebar
   */
  startSidebarTutorial(): void {
    if (!this.user) return

    this.sidebarTutorialService.startSidebarTutorial(this.user, this.topLinks, this.bottomLinks, (route: string) =>
      this.router.navigate([route])
    )

    // Marquer le tutoriel comme vu
    localStorage.setItem(`platon-sidebar-tutorial-${this.user.id}`, 'true')
  }

  /**
   * Réinitialise le tutoriel (pour les tests ou si l'utilisateur veut le revoir)
   */
  resetTutorial(): void {
    if (this.user) {
      localStorage.removeItem(`platon-sidebar-tutorial-${this.user.id}`)
      this.isFirstVisit = true
      this.startSidebarTutorial()
    }
  }
}
