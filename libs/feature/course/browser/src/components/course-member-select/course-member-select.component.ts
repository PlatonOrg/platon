/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, forwardRef } from '@angular/core'
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms'

import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select'

import { UserAvatarComponent } from '@platon/core/browser'
import { userDisplayName } from '@platon/core/common'
import { CourseMember } from '@platon/feature/course/common'
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree'

@Component({
  standalone: true,
  selector: 'course-member-select',
  templateUrl: './course-member-select.component.html',
  styleUrls: ['./course-member-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CourseMemberSelectComponent),
      multi: true,
    },
  ],
  imports: [CommonModule, FormsModule, NzTreeSelectModule, UserAvatarComponent],
})
export class CourseMemberSelectComponent implements ControlValueAccessor {
  protected disabled = false
  protected nodes: NzTreeNodeOptions[] = []
  protected selection: string[] = []

  private readonly SELECT_ALL_KEY = '__SELECT_ALL__'
  private memberIds: string[] = []
  private isUpdatingProgrammatically = false

  @Input() placeholder?: string

  @Input()
  set members(value: CourseMember[]) {
    this.memberIds = []

    const memberNodes = value.map((member) => {
      const title = member.user ? userDisplayName(member.user) : member.group?.name || ''

      this.memberIds.push(member.id)

      if (member.group) {
        member.group.users.forEach((user) => {
          this.memberIds.push(`${member.id}:${user.id}`)
        })
      }

      return {
        key: member.id,
        value: {
          user: member.user,
          group: member.group,
        },
        title,
        isLeaf: !member.group,
        children: member.group
          ? member.group.users.map((user) => {
              return {
                key: `${member.id}:${user.id}`,
                value: {
                  user,
                },
                title: userDisplayName(user),
                isLeaf: true,
              } as NzTreeNodeOptions
            })
          : undefined,
      } as NzTreeNodeOptions
    })

    const selectAllNode: NzTreeNodeOptions = {
      key: this.SELECT_ALL_KEY,
      value: null,
      title: 'Sélectionner tout',
      isLeaf: true,
    }

    this.nodes = [selectAllNode, ...memberNodes]
  }

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}

  // ControlValueAccessor methods

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
      this.selection = [this.SELECT_ALL_KEY, ...this.memberIds]
    }
    // Cas 2 : "Sélectionner tout" vient d'être décoché
    else if (!newHasSelectAll && previousHasSelectAll) {
      this.selection = []
    }
    // Cas 3 : Modification d'un ou plusieurs membres individuels
    else {
      const memberSelection = selection.filter((id) => id !== this.SELECT_ALL_KEY)

      if (this.areAllMembersSelectedInArray(memberSelection)) {
        this.selection = [this.SELECT_ALL_KEY, ...memberSelection]
      } else {
        this.selection = memberSelection
      }
    }

    setTimeout(() => {
      this.isUpdatingProgrammatically = false
      this.changeDetectorRef.detectChanges()
    }, 0)

    const finalMemberSelection = this.selection.filter((id) => id !== this.SELECT_ALL_KEY)

    this.onTouch()
    this.onChange(finalMemberSelection)
  }

  private areAllMembersSelected(): boolean {
    const selectedMembers = this.selection.filter((id) => id !== this.SELECT_ALL_KEY)
    return this.areAllMembersSelectedInArray(selectedMembers)
  }

  private areAllMembersSelectedInArray(selectedMembers: string[]): boolean {
    return (
      this.memberIds.length > 0 &&
      selectedMembers.length === this.memberIds.length &&
      this.memberIds.every((id) => selectedMembers.includes(id))
    )
  }

  private updateSelectionWithSelectAll(): void {
    if (this.areAllMembersSelected() && !this.selection.includes(this.SELECT_ALL_KEY)) {
      this.selection = [this.SELECT_ALL_KEY, ...this.selection]
    }
  }
}
