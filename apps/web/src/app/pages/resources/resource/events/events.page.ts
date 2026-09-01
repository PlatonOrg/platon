import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { RouterModule } from '@angular/router'
import { Subscription } from 'rxjs'

import { ResourceEventListComponent } from '@platon/feature/resource/browser'
import { ResourceEvent } from '@platon/feature/resource/common'
import { ResourcePresenter } from '../resource.presenter'
import { ResourcePipesModule } from '@platon/feature/resource/browser'

@Component({
  selector: 'app-resource-events',
  templateUrl: './events.page.html',
  styleUrls: ['./events.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, ResourceEventListComponent, ResourcePipesModule],
})
export class ResourceEventsPage implements OnInit, OnDestroy {
  private readonly presenter = inject(ResourcePresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  private readonly subscriptions: Subscription[] = []
  protected context = this.presenter.defaultContext()
  protected events: ResourceEvent[] = []

  ngOnInit(): void {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        if (context.resource) {
          this.events = (
            await this.presenter.listEvents({
              limit: 50,
            })
          ).resources
        }
        this.changeDetectorRef.markForCheck()
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }
}
