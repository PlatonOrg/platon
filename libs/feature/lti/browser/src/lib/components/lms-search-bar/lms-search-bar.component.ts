/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, Input } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { combineLatest, Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'

import { NgeUiListModule } from '@cisstech/nge/ui/list'
import { Lms, LmsFilters } from '@platon/feature/lti/common'
import { SearchBar, UiSearchBarComponent } from '@platon/shared/ui'
import { LTIService } from '../../api/lti.service'

@Component({
  standalone: true,
  selector: 'lms-search-bar',
  templateUrl: './lms-search-bar.component.html',
  styleUrls: ['./lms-search-bar.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LmsSearchBarComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzButtonModule, NgeUiListModule, UiSearchBarComponent],
})
export class LmsSearchBarComponent implements ControlValueAccessor {
  @Input() multi = true
  @Input() excludes: string[] = []
  @Input() disabled = false
  @Input() autoSelect = false

  @Input() filters: LmsFilters = {
    limit: 5,
  }

  readonly searchbar: SearchBar<Lms> = {
    placeholder: 'Essayez un nom...',
    filterer: {
      run: this.search.bind(this),
    },
    complete: (item) => item.name,
    onSelect: (item) => {
      if (this.autoSelect) return

      this.searchbar.value = ''
      if (!this.multi) {
        this.selection = []
      }

      this.selection.push(item)
      this.onChangeSelection()
    },
  }

  selection: Lms[] = []

  constructor(
    private readonly ltiService: LTIService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  // ControlValueAccessor methods

  onTouch: any = () => {
    //
  }
  onChange: any = () => {
    //
  }

  writeValue(value: any): void {
    this.selection = Array.isArray(value) ? value : value ? [value] : []
    this.changeDetectorRef.markForCheck()
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
  }

  protected search(query: string): Observable<Lms[]> {
    const requests: Observable<Lms[]>[] = []

    requests.push(
      this.ltiService
        .searchLms({
          ...this.filters,
          search: query,
        })
        .pipe(
          map((page) => {
            if (this.autoSelect) {
              return page.resources
            }
            return page.resources.filter(this.isSelectable.bind(this))
          })
        )
    )

    return combineLatest(requests).pipe(
      map((res) => {
        const flat = res.flat()
        if (this.autoSelect) {
          this.selection = flat
          this.onChangeSelection()
        }
        return flat.slice(0, 5)
      })
    )
  }

  protected remove(item: Lms): void {
    this.selection = this.selection.filter((e) => e.id !== item.id)
    this.onChangeSelection()
  }

  private isSelectable(item: Lms): boolean {
    const isSelected = this.selection.find((e) => e.id === item.id)
    const isExclued = this.excludes.find((id) => {
      return id === item.id
    })
    return !isSelected && !isExclued
  }

  private onChangeSelection(): void {
    if (this.multi) {
      this.onTouch(this.selection)
      this.onChange(this.selection)
    } else {
      this.onTouch(this.selection[0])
      this.onChange(this.selection[0])
    }
    this.changeDetectorRef.markForCheck()
  }
}
