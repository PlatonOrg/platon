import { Component, EventEmitter, Input, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Restriction, RestrictionConfig } from '@platon/feature/course/common'
import { CourseGroup, CourseMember } from '@platon/feature/course/common'

import { CourseMemberSelectComponent } from '../../course-member-select/course-member-select.component'
import { CourseGroupSelectComponent } from '../../course-group-select/course-group-select.component'

// Module
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker'
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
import { FormsModule } from '@angular/forms'
import { NzButtonModule, NzButtonSize } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzCardModule } from 'ng-zorro-antd/card'
import { NzSpaceModule } from 'ng-zorro-antd/space'

@Component({
  selector: 'course-restriction',
  standalone: true,
  imports: [
    CommonModule,
    NzDatePickerModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzSpaceModule,
    CourseMemberSelectComponent,
    CourseGroupSelectComponent,
  ],
  templateUrl: './restriction.component.html',
  styleUrl: './restriction.component.scss',
})
export class RestrictionComponent {
  @Input() restriction!: Restriction
  @Output() remove = new EventEmitter<void>()
  @Output() update = new EventEmitter<Restriction>()
  @Input() courseMembers: CourseMember[] = []
  @Input() courseGroups: CourseGroup[] = []
  @Input() isSubRestriction = false

  size: NzButtonSize = 'large'

  protected disabledDate = (current: Date): boolean => differenceInCalendarDays(current, new Date()) < 0

  removeRestriction() {
    this.remove.emit()
  }

  isDateRangeConfig(config: RestrictionConfig[keyof RestrictionConfig]): config is RestrictionConfig['DateRange'] {
    return 'start' in config || 'end' in config
  }

  isMembersConfig(config: RestrictionConfig[keyof RestrictionConfig]): config is RestrictionConfig['Members'] {
    return 'members' in config
  }

  isCorrectorsConfig(config: RestrictionConfig[keyof RestrictionConfig]): config is RestrictionConfig['Correctors'] {
    return 'correctors' in config
  }

  isGroupsConfig(config: RestrictionConfig[keyof RestrictionConfig]): config is RestrictionConfig['Groups'] {
    return 'groups' in config
  }
}
