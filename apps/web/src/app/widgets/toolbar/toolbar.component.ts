import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import * as echarts from 'echarts/core'
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
  AfterViewInit,
} from '@angular/core'
import { NavigationStart, Router, RouterModule } from '@angular/router'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'

import { AuthService, ThemeService, UserAvatarComponent, UserService } from '@platon/core/browser'
import { UserCharterComponent } from './user-charter/user-charter.component'
import { User, UserCharter, UserRoles } from '@platon/core/common'
import { NotificationDrawerComponent } from '@platon/feature/notification/browser'
import { DiscordInvitationComponent, DiscordButtonComponent } from '@platon/feature/discord/browser'
import { ResourcePipesModule, ResourceService } from '@platon/feature/resource/browser'
import { TutoService, toolbarSteps, defaultStepOptions } from '@platon/feature/tuto'

import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { firstValueFrom, Subscription } from 'rxjs'
import { UiModalTemplateComponent } from '@platon/shared/ui'

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
export class ToolbarComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() drawerOpened = false
  @Output() drawerOpenedChange = new EventEmitter<boolean>()

  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly themeService = inject(ThemeService)
  private readonly resourceService = inject(ResourceService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly breakpointObserver = inject(BreakpointObserver)
  private readonly elementRef = inject(ElementRef)
  private readonly tutoService = inject(TutoService)

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
  // Track if tutorial has been initialized
  private tutoInitialized = false

  constructor(private readonly userService: UserService) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initTutorial()
    }, 500)
  }

  /**
   * Initialize the tutorial with proper context
   */
  private initTutorial(): void {
    const echartElements = document.querySelectorAll('[_echarts_instance_]')
    for (let i = 0; i < echartElements.length; i++) {
      const element = echartElements[i] as HTMLElement
      const instance = echarts.getInstanceByDom(element)
      if (instance) {
        echarts.dispose(element)
      }
    }

    this.tutoService.setCurrentPage('toolbar')

    // Configure the tutorial
    this.tutoService.defaultStepOptions = defaultStepOptions
    this.tutoService.modal = false
    this.tutoService.confirmCancel = false

    // Add required elements for validation
    this.tutoService.requiredElements = [
      {
        selector: '#tuto-toolbar-menu-button',
        title: 'Menu Button Missing',
        message: 'The tutorial cannot start because the menu button is not visible.',
      },
      {
        selector: '#tuto-toolbar-theme-button',
        title: 'Theme Button Missing',
        message: 'The tutorial cannot start because the theme button is not visible.',
      },
      {
        selector: '#tuto-toolbar-notifications-button',
        title: 'Notifications Button Missing',
        message: 'The tutorial cannot start because the notifications button is not visible.',
      },
    ]

    // Add the steps
    this.tutoService.addSteps(toolbarSteps)

    // Only start the tutorial if not already active
    if (!this.tutoService.isActive && !this.tutoInitialized) {
      this.tutoInitialized = true
      console.log('Starting toolbar tutorial')
      void this.tutoService.start()
    }
  }

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

    this.subscriptions.push(
      this.router.events.subscribe((event) => {
        // Cancel tutorial on navigation
        if (event instanceof NavigationStart && this.tutoService.isActive) {
          this.tutoService.clearTour()
        }
      })
    )

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
    // Clean up tutorials when component is destroyed
    if (this.tutoService.isActive) {
      this.tutoService.clearTour()
    }
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  signOut(): void {
    // Cancel any running tutorials before signing out
    this.tutoService.clearTour()
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
}
