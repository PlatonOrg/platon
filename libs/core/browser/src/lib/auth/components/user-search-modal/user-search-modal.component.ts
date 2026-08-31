import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  booleanAttribute,
  inject,
} from '@angular/core'
import { FormsModule } from '@angular/forms'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzModalModule } from 'ng-zorro-antd/modal'

import { User, UserFilters, UserGroup } from '@platon/core/common'
import { UiModalTemplateComponent } from '@platon/shared/ui'

import { UserSearchBarComponent } from '../user-search-bar/user-search-bar.component'

@Component({
  selector: 'user-search-modal',
  templateUrl: './user-search-modal.component.html',
  styleUrls: ['./user-search-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzModalModule, NzButtonModule, UserSearchBarComponent, UiModalTemplateComponent],
})
export class UserSearchModalComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  @Input() title = ''
  @Input() okTitle = 'OK'
  @Input() noTitle = 'Annuler'
  @Input() filters: UserFilters = {}
  @Input() excludes: string[] = []
  @Input({ transform: booleanAttribute }) multi = true
  @Input({ transform: booleanAttribute }) allowGroup = false

  @Output() closed = new EventEmitter<(User | UserGroup)[]>()

  @ViewChild(UiModalTemplateComponent, { static: true })
  protected modal!: UiModalTemplateComponent

  protected selection: User[] = []
  protected get ready(): boolean {
    const n = this.selection.length
    return !this.multi ? n === 1 : n > 0
  }

  open(): void {
    this.modal.open()
  }

  close(data: User[]): void {
    this.closed.emit(data)
    this.selection = []
    this.changeDetectorRef.markForCheck()
  }
}
