import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterModule, ActivatedRoute } from '@angular/router'
import { Subscription } from 'rxjs'
import { Title } from '@angular/platform-browser'

import { MatChipsModule } from '@angular/material/chips'
import { MatIconModule } from '@angular/material/icon'

import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzTypographyModule } from 'ng-zorro-antd/typography'

import { DialogModule } from '@platon/core/browser'
import { CircleTreeComponent, ResourcePipesModule, ResourceSharingComponent } from '@platon/feature/resource/browser'
import { ExerciseResourceMeta, ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'
import { UiLayoutTabDirective, UiLayoutTabsComponent, UiModalIFrameComponent } from '@platon/shared/ui'

import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { ResourcePresenter } from './resource.presenter'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { ResourcePageTutorialService, ResourcesTutorialService } from '@platon/feature/tuto/browser'

@Component({
  selector: 'app-resource',
  templateUrl: './resource.page.html',
  styleUrls: ['./resource.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ResourcePresenter],
  imports: [
    FormsModule,
    RouterModule,
    MatIconModule,
    MatChipsModule,
    NzIconModule,
    NzSelectModule,
    NzButtonModule,
    NzPopoverModule,
    NzTooltipModule,
    NzBreadCrumbModule,
    NzTypographyModule,
    NzPageHeaderModule,
    NzPopconfirmModule,
    DialogModule,
    UiLayoutTabsComponent,
    UiModalIFrameComponent,
    UiLayoutTabDirective,
    CircleTreeComponent,
    ResourcePipesModule,
    ResourceSharingComponent,
  ],
})
export class ResourcePage implements OnInit, OnDestroy {
  private titleService = inject(Title)

  private readonly subscriptions: Subscription[] = []
  private readonly presenter = inject(ResourcePresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly router = inject(Router)
  private readonly resourcePageTutorialService = inject(ResourcePageTutorialService)

  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly resourcesTutorialService = inject(ResourcesTutorialService)

  protected context = this.presenter.defaultContext()

  readonly status = Object.values(ResourceStatus)

  protected isChangingWatchingState = false

  protected configurable = false
  protected certifiedTemplate = false

  get isOtherPersonal(): boolean {
    return this.context.resource!.personal && this.context.resource!.ownerId !== this.context.user!.id
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context

        if (this.context.resource?.type === ResourceTypes.EXERCISE) {
          const metadata = this.context.resource?.metadata as ExerciseResourceMeta
          this.configurable = metadata?.configurable
          this.certifiedTemplate = metadata?.certifiedTemplate
        }

        this.changeDetectorRef.markForCheck()

        if (this.context.resource?.name) {
          this.titleService.setTitle('Ressource - ' + this.context.resource?.name)
        }
      })
    )
    this.checkForTutorialContinuation()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected async updateName(name: string) {
    if (name.trim()) {
      await this.presenter.update({ name })
    }
  }

  protected async updateDesc(desc: string) {
    if (desc.trim()) {
      await this.presenter.update({ desc })
    }
  }

  protected async updateStatus(status: ResourceStatus) {
    await this.presenter.update({ status })
  }

  protected async changeWatchingState(): Promise<void> {
    this.isChangingWatchingState = true
    this.changeDetectorRef.markForCheck()
    try {
      if (this.context.resource?.permissions?.watcher) {
        await this.presenter.unwatch()
      } else {
        await this.presenter.watch()
      }
    } finally {
      this.isChangingWatchingState = false
    }
  }

  protected async join(): Promise<void> {
    await this.presenter.join()
  }

  protected async unjoin(): Promise<void> {
    await this.presenter.unjoin()
  }

  protected trackByValue(_: number, item: unknown) {
    return item
  }

  protected openTab(url: string): void {
    window.open(url, '_blank')
  }

  protected urlPath(url: string): string {
    return new URL(url, window.location.origin).pathname
  }

  protected async duplicate(): Promise<void> {
    const duplicatedResourceId = await this.presenter.duplicate()
    if (duplicatedResourceId) {
      await this.router.navigate(['/resources', duplicatedResourceId])
    }
  }

  protected isAdmin(): boolean {
    return this.context.user?.role === 'admin'
  }

  protected canMove(): boolean {
    return this.context.parent?.personal || this.isAdmin()
  }

  protected async moveToOwnerCircle(): Promise<void> {
    await this.presenter.moveToOwnerCircle()
    await this.router.navigate(['/resources'])
  }

  protected async delete(): Promise<void> {
    await this.presenter.delete()
    await this.router.navigate(['/resources'])
  }

  protected referencesNumber(): number {
    return this.context.resource?.statistic?.exercise?.references?.total || 0
  }

  private checkForTutorialContinuation(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      const fromTutorial = params['fromTutorial'] as string
      const isFromTutorialService = this.resourcesTutorialService.getIsFromTutorial()
      if (fromTutorial === 'true' || isFromTutorialService) {
        // Attendre que le contexte soit chargé avant de lancer le tuto
        const sub = this.presenter.contextChange.subscribe((ctx) => {
          if (ctx.resource) {
            sub.unsubscribe()
            setTimeout(() => this.startResourcePageTutorial(), 500)
            this.cleanTutorialParams()
            this.resourcesTutorialService.resetTutorialFlag()
          }
        })
        this.subscriptions.push(sub)
      }
    })
  }

  startResourcePageTutorial(): void {
    if (this.context.resource) {
      this.resourcePageTutorialService.startResourcePageTutorial(this.context.resource, false, false, false)
    }
  }

  private cleanTutorialParams(): void {
    const url = new URL(window.location.href)
    url.searchParams.delete('fromTutorial')
    window.history.replaceState(null, '', url.toString())
  }

  protected async updateCertification(certified: boolean): Promise<void> {
    if (await this.presenter.updateCertification(certified)) {
      this.certifiedTemplate = certified
    }
  }
}
