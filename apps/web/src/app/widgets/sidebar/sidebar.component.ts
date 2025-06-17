import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { Router, RouterModule } from '@angular/router'
import { AuthService } from '@platon/core/browser'
import { User, UserRoles, isTeacherRole } from '@platon/core/common'
import { SidebarTutorialService } from '@platon/feature/tuto/browser'
import { NzModalModule } from 'ng-zorro-antd/modal'

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
  imports: [CommonModule, RouterModule, MatIconModule, NzModalModule],
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

  protected generateId(title: string): string {
    return 'tuto-sidebar-' + title.toLowerCase().replace(/ /g, '-')
  }
}
