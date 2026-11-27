import { CommonModule } from '@angular/common'
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Input,
  OnDestroy,
  QueryList,
  inject,
} from '@angular/core'

import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzTabsModule } from 'ng-zorro-antd/tabs'

import { ActivatedRoute, RouterModule } from '@angular/router'
import { combineLatest, Observable, Subscription } from 'rxjs'
import { UiError403Component, UiError404Component, UiError500Component } from '../../error'
import { type LayoutState } from '../layout'
import { UiLayoutTabDirective } from './directives/tab-title.directive'

@Component({
  selector: 'ui-layout-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NzTabsModule,
    NzSkeletonModule,
    UiError403Component,
    UiError404Component,
    UiError500Component,
  ],
})
export class UiLayoutTabsComponent implements AfterContentInit, OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private route = inject(ActivatedRoute)

  private readonly subscriptions: Subscription[] = []

  @Input() state: LayoutState = 'READY'

  @ContentChildren(UiLayoutTabDirective)
  query!: QueryList<UiLayoutTabDirective>

  protected tabs: UiLayoutTabDirective[] = []
  protected selectedTabIndex = 0

  async ngAfterContentInit(): Promise<void> {
    this.query.changes.subscribe(async (changes) => {
      this.query = changes
      handleChanges(this.query.toArray())
      await this.refreshSelectedTabIndex()
    })

    const handleChanges = (results: UiLayoutTabDirective[]) => {
      this.tabs = Array.from(results)
      this.changeDetectorRef.markForCheck()
    }

    handleChanges(this.query.toArray())

    this.subscriptions.push(
      combineLatest([this.query.changes as Observable<UiLayoutTabDirective[]>]).subscribe(([results]) => {
        handleChanges(results)
      })
    )

    await this.refreshSelectedTabIndex()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  private async refreshSelectedTabIndex(): Promise<void> {
    const path = this.route.snapshot.firstChild?.routeConfig?.path?.split('?')[0]
    this.selectedTabIndex = this.tabs.findIndex((tab) => tab.link[0] === path)
    this.changeDetectorRef.markForCheck()
  }
}
