import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'

import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  ElementRef,
} from '@angular/core'
import { Router, RouterModule } from '@angular/router'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'

import { AuthService, ThemeService, UserAvatarComponent, UserService } from '@platon/core/browser'
import { UserCharterComponent } from './user-charter/user-charter.component'
import { User, UserCharter, UserRoles } from '@platon/core/common'
import { NotificationDrawerComponent } from '@platon/feature/notification/browser'
import { DiscordInvitationComponent, DiscordButtonComponent } from '@platon/feature/discord/browser'
import { ResourcePipesModule, ResourceService } from '@platon/feature/resource/browser'

import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { firstValueFrom, Subscription } from 'rxjs'
import { UiModalTemplateComponent } from '@platon/shared/ui'
// Import du service de tutoriel
import { ToolbarTutorialService } from 'tuto' // à avec avec @platon/feature/tuto/browser
import { MatDividerModule } from '@angular/material/divider'

@Component({
  standalone: true,
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,

    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatButtonModule,

    NzIconModule,
    NzBadgeModule,
    NzButtonModule,
    NzPopoverModule,

    ResourcePipesModule,
    UserAvatarComponent,
    NotificationDrawerComponent,
    DiscordInvitationComponent,
    DiscordButtonComponent,

    UiModalTemplateComponent,

    NzPopoverModule,
    NzModalModule,

    UserCharterComponent,
  ],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  @Input() drawerOpened = false
  @Output() drawerOpenedChange = new EventEmitter<boolean>()

  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly themeService = inject(ThemeService)
  private readonly resourceService = inject(ResourceService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly breakpointObserver = inject(BreakpointObserver)
  private readonly elementRef = inject(ElementRef)
  private readonly toolbarTutorialService = inject(ToolbarTutorialService)

  private readonly subscriptions: Subscription[] = []

  protected user?: User | undefined
  protected userCharter?: UserCharter
  protected personalCircleId?: string | undefined

  protected canCreateCourse = false
  protected canCreateCircle = false
  protected canCreateExercise = false
  protected canCreateActivity = false
  protected loggedToDiscord = false

  protected userCharterModalVisible = false
  protected userCharterAccepted = false

  @ViewChild(UiModalTemplateComponent, { static: true })
  protected modal!: UiModalTemplateComponent

  protected get canCreate(): boolean {
    return this.canCreateCourse || this.canCreateCircle || this.canCreateExercise || this.canCreateActivity
  }

  protected get createResourceParentParam(): string | undefined {
    const tree = this.router.parseUrl(this.router.url)
    const { segments } = tree.root.children.primary
    if (segments.length > 1 && segments[0].path === 'resources') {
      return segments[1].path
    }
    return undefined
  }

  get themeIcon(): string {
    return this.themeService.themeIcon
  }

  get mobile(): boolean {
    return this.breakpointObserver.isMatched([Breakpoints.XSmall])
  }

  get tabletOrBelow(): boolean {
    return this.breakpointObserver.isMatched([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Tablet])
  }

  constructor(private readonly userService: UserService) {}

  async ngOnInit(): Promise<void> {
    this.drawerOpened = !this.breakpointObserver.isMatched([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Tablet])
    this.drawerOpenedChange.emit(this.drawerOpened)

    this.user = (await this.authService.ready()) as User
    this.loggedToDiscord =
      this.user.discordId !== null && this.user.discordId !== undefined && this.user.discordId !== ''
    this.personalCircleId = (await firstValueFrom(this.resourceService.circle(this.user.username))).id

    this.canCreateCourse = this.user.role === UserRoles.admin || this.user.role === UserRoles.teacher

    this.canCreateCircle = this.resourceService.canUserCreateResource(this.user, 'CIRCLE')
    this.canCreateExercise = this.resourceService.canUserCreateResource(this.user, 'EXERCISE')
    this.canCreateActivity = this.resourceService.canUserCreateResource(this.user, 'ACTIVITY')

    if (this.user.role === UserRoles.teacher || this.user.role === UserRoles.admin) {
      this.userCharter = await firstValueFrom(this.userService.findUserCharterById(this.user.id))
      this.userCharterAccepted = this.userCharter?.acceptedUserCharter ?? false
    }

    // Vérifier si c'est la première visite pour déclencher le tutoriel
    this.checkFirstVisit()

    this.subscriptions.push(
      this.breakpointObserver
        .observe([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Tablet])
        .subscribe((state) => {
          if (state.matches && this.drawerOpened) {
            this.drawerOpened = false
            this.drawerOpenedChange.emit(this.drawerOpened)
          }
        }),
      this.breakpointObserver.observe([Breakpoints.Large, Breakpoints.XLarge]).subscribe((state) => {
        if (state.matches && !this.drawerOpened) {
          this.drawerOpened = true
          this.drawerOpenedChange.emit(this.drawerOpened)
        }
        this.changeDetectorRef.markForCheck()
      })
    )

    this.changeDetectorRef.markForCheck()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  signOut(): void {
    this.authService.signOut().catch(console.error)
  }

  darkTheme(): void {
    document.body.style.opacity = '0'
    document.body.style.transition = 'opacity 0.2s ease-in-out'
    document.body.style.transition = 'none'
    setTimeout(() => {
      this.themeService.darkTheme(true)
    }, 200)

    setTimeout(() => {
      document.body.style.opacity = '1'
      this.changeDetectorRef.markForCheck()
    }, 500)
  }

  lightTheme(): void {
    document.body.style.opacity = '0'
    document.body.style.transition = 'opacity 0.2s ease-in-out'
    setTimeout(() => {
      this.themeService.lightTheme(true)
    }, 200)
    setTimeout(() => {
      document.body.style.opacity = '1'
      document.body.style.transition = 'none'
      this.changeDetectorRef.markForCheck()
    }, 500)
  }

  systemTheme(): void {
    document.body.style.opacity = '0'
    document.body.style.transition = 'opacity 0.2s ease-in-out'
    setTimeout(() => {
      this.themeService.systemTheme(true)
    }, 200)
    setTimeout(() => {
      document.body.style.opacity = '1'
      document.body.style.transition = 'none'
      this.changeDetectorRef.markForCheck()
    }, 500)
  }

  openDiscordModal(): void {
    this.modal.open()
  }

  async acceptUserCharter(): Promise<void> {
    if (!this.userCharterAccepted) {
      this.userCharterModalVisible = true
      this.changeDetectorRef.markForCheck()
    }
  }

  onUserCharterAccepted(updateCharter: UserCharter): void {
    this.userCharter = { ...updateCharter }
    this.userCharterAccepted = this.userCharter?.acceptedUserCharter ?? false

    this.changeDetectorRef.detectChanges()

    setTimeout(() => {
      const buttonElement = this.elementRef.nativeElement.querySelector('button[nzType="primary"]')
      if (buttonElement) {
        buttonElement.click()
      }
    })
  }

  // Debut tuto
  protected isFirstVisit = true
  /**
   * Vérifie si c'est la première visite de l'utilisateur
   */
  private checkFirstVisit(): void {
    //const hasSeenTutorial = localStorage.getItem(`platon-toolbar-tutorial-${this.user?.id}`)
    //this.isFirstVisit = !hasSeenTutorial

    // Si c'est la première visite, démarrer le tutoriel automatiquement après un délai
    if (this.isFirstVisit && this.user) {
      setTimeout(() => {
        this.startToolbarTutorial()
      }, 1000) // Délai de 1 seconde pour permettre à la page de se charger
    }
  }

  /**
   * Démarre le tutoriel complet du toolbar
   */
  startToolbarTutorial(): void {
    if (!this.user) return

    this.toolbarTutorialService.startToolbarTutorial(this.user, this.personalCircleId, this.createResourceParentParam)

    // Marquer le tutoriel comme vu
    //localStorage.setItem(`platon-toolbar-tutorial-${this.user.id}`, 'true')
  }

  /**
   * Démarre le tutoriel de création de ressource
   */
  startResourceTutorial(): void {
    if (!this.user) return

    this.toolbarTutorialService.startResourceCreationTutorial(this.user, this.createResourceParentParam)
  }

  /**
   * Démarre un tutoriel rapide pour une fonctionnalité spécifique
   */
  startQuickTour(feature: 'notifications' | 'theme' | 'menu' | 'profile'): void {
    this.toolbarTutorialService.startQuickTour(feature)
  }

  /**
   * Réinitialise le tutoriel (pour les tests ou si l'utilisateur veut le revoir)
   */
  resetTutorial(): void {
    if (this.user) {
      //localStorage.removeItem(`platon-toolbar-tutorial-${this.user.id}`)
      this.isFirstVisit = true
    }
  }

  setDataTourActive(event: MouseEvent, qualifiedName: string, value: string): void {
    const target = event.target as HTMLElement
    target.setAttribute(qualifiedName, value)
  }
}
