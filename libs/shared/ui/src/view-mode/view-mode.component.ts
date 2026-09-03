import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NzSegmentedModule, NzSegmentedOption } from 'ng-zorro-antd/segmented'
import { Subscription } from 'rxjs'
import { type ViewModes, viewModeIcons, viewModes } from './view-mode'

@Component({
  selector: 'ui-view-mode',
  templateUrl: './view-mode.component.html',
  styleUrls: ['./view-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzSegmentedModule],
})
export class UiViewModeComponent implements OnInit, OnDestroy {
  private readonly subscriptions: Subscription[] = []
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly breakpointObserver = inject(BreakpointObserver)

  protected options: NzSegmentedOption[] = viewModes.map((mode) => ({
    label: '',
    value: mode,
    disabled: false,
    icon: viewModeIcons[mode],
  }))

  protected selectionMode: ViewModes = 'list'

  @Input() storageKey = 'view-mode'
  @Input() defaultMode: ViewModes = 'list'

  @Input()
  set modes(value: ViewModes[]) {
    this.options = value.map((mode) => ({
      label: '',
      value: mode,
      icon: viewModeIcons[mode],
    }))
  }

  get mode(): ViewModes {
    return this.selectionMode
  }

  ngOnInit(): void {
    const mode = localStorage.getItem(this.storageKey)
    if (mode && viewModes.includes(mode as ViewModes)) {
      this.selectionMode = mode as ViewModes
    } else {
      this.selectionMode = this.defaultMode
    }

    this.subscriptions.push(
      this.breakpointObserver.observe([Breakpoints.XSmall, Breakpoints.Small]).subscribe((state) => {
        if (state.matches && this.mode === 'table') {
          this.onChangeMode(this.mode)
        }
      }),

      this.breakpointObserver
        .observe([Breakpoints.Medium, Breakpoints.Large, Breakpoints.XLarge])
        .subscribe((state) => {
          this.options = this.options.map((option) => {
            option.disabled = !state.matches && option.value === 'table'
            return option
          })
          this.changeDetectorRef.markForCheck()
        })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected onChangeMode(mode: ViewModes): void {
    this.selectionMode = mode
    localStorage.setItem(this.storageKey, mode)
    this.changeDetectorRef.markForCheck()
  }
}
