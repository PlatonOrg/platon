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

import { UiModalTemplateComponent } from '@platon/shared/ui'
import { CourseMemberSearchBarComponent } from '../course-member-search-bar/course-member-search-bar.component'
import { CourseMember } from '@platon/feature/course/common'

@Component({
  selector: 'course-member-search-modal',
  templateUrl: './course-member-search-modal.component.html',
  styleUrls: ['./course-member-search-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzModalModule, NzButtonModule, CourseMemberSearchBarComponent, UiModalTemplateComponent],
})
export class CourseMemberSearchModalComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  @Input() title = ''
  @Input() okTitle = 'OK'
  @Input() noTitle = 'Annuler'
  @Input() excludes: string[] = []
  @Input({ transform: booleanAttribute }) multi = true
  @Input({ transform: booleanAttribute }) allowGroup = false
  @Input({ required: true }) courseId!: string

  @Output() closed = new EventEmitter<CourseMember[]>()

  @ViewChild(UiModalTemplateComponent, { static: true })
  protected modal!: UiModalTemplateComponent

  protected selection: CourseMember[] = []
  protected get ready(): boolean {
    const n = this.selection.length
    return !this.multi ? n === 1 : n > 0
  }

  open(): void {
    this.modal.open()
  }

  close(data: CourseMember[]): void {
    this.closed.emit(data)
    this.selection = []
    this.changeDetectorRef.markForCheck()
  }
}
