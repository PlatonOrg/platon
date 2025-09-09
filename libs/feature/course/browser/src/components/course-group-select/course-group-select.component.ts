/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, forwardRef } from '@angular/core'
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms'

import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select'

import { UserAvatarComponent } from '@platon/core/browser'
import { CourseGroup } from '@platon/feature/course/common'
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree'

@Component({
  standalone: true,
  selector: 'course-group-select',
  templateUrl: './course-group-select.component.html',
  styleUrls: ['./course-group-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CourseGroupSelectComponent),
      multi: true,
    },
  ],
  imports: [CommonModule, FormsModule, NzTreeSelectModule, UserAvatarComponent],
})
export class CourseGroupSelectComponent implements ControlValueAccessor {
  protected disabled = false
  protected nodes: NzTreeNodeOptions[] = []
  protected selection: string[] = []

  private readonly SELECT_ALL_KEY = '__SELECT_ALL__'
  private groupIds: string[] = []
  private isUpdatingProgrammatically = false // Flag pour éviter les boucles

  @Input() placeholder?: string

  @Input()
  set groups(value: CourseGroup[]) {
    this.groupIds = value.map((group) => group.id)

    const groupNodes: NzTreeNodeOptions[] = value.map((group) => ({
      key: group.id,
      value: group,
      title: group.name,
      isLeaf: true,
    }))

    const selectAllNode: NzTreeNodeOptions = {
      key: this.SELECT_ALL_KEY,
      value: null,
      title: 'Sélectionner tout',
      isLeaf: true,
    }

    this.nodes = [selectAllNode, ...groupNodes]
  }

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}

  onTouch: any = () => {
    //
  }

  onChange: any = () => {
    //
  }

  writeValue(value: string[]): void {
    this.selection = value || []
    this.updateSelectionWithSelectAll()
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

  protected onChangeSelection(selection: string[]): void {
    if (this.isUpdatingProgrammatically) {
      return
    }

    const newHasSelectAll = selection.includes(this.SELECT_ALL_KEY)
    const previousHasSelectAll = this.selection.includes(this.SELECT_ALL_KEY)

    this.isUpdatingProgrammatically = true

    // Cas 1 : "Sélectionner tout" vient d'être coché
    if (newHasSelectAll && !previousHasSelectAll) {
      this.selection = [this.SELECT_ALL_KEY, ...this.groupIds]
    }
    // Cas 2 : "Sélectionner tout" vient d'être décoché
    else if (!newHasSelectAll && previousHasSelectAll) {
      this.selection = []
    }
    // Cas 3 : Modification d'un ou plusieurs groupes individuels
    else {
      const groupSelection = selection.filter((id) => id !== this.SELECT_ALL_KEY)

      if (this.areAllGroupsSelectedInArray(groupSelection)) {
        this.selection = [this.SELECT_ALL_KEY, ...groupSelection]
      } else {
        this.selection = groupSelection
      }
    }

    setTimeout(() => {
      this.isUpdatingProgrammatically = false
      this.changeDetectorRef.detectChanges()
    }, 0)

    const finalGroupSelection = this.selection.filter((id) => id !== this.SELECT_ALL_KEY)

    this.onTouch()
    this.onChange(finalGroupSelection)
  }

  private areAllGroupsSelected(): boolean {
    const selectedGroups = this.selection.filter((id) => id !== this.SELECT_ALL_KEY)
    return this.areAllGroupsSelectedInArray(selectedGroups)
  }

  private areAllGroupsSelectedInArray(selectedGroups: string[]): boolean {
    return (
      this.groupIds.length > 0 &&
      selectedGroups.length === this.groupIds.length &&
      this.groupIds.every((id) => selectedGroups.includes(id))
    )
  }

  private updateSelectionWithSelectAll(): void {
    if (this.areAllGroupsSelected() && !this.selection.includes(this.SELECT_ALL_KEY)) {
      this.selection = [this.SELECT_ALL_KEY, ...this.selection]
    }
  }
}
