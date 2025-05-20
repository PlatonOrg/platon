import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzCardModule } from 'ng-zorro-antd/card'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { NzGridModule } from 'ng-zorro-antd/grid'

import { PropositionsComponent } from '../propositions/propositions.component'
import { RestrictionComponent } from '../restriction/restriction.component'
import { Activity, CourseGroup, CourseMember, Restriction } from '@platon/feature/course/common'

@Component({
  selector: 'course-restriction-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzModalModule,
    NzGridModule,
    PropositionsComponent,
    RestrictionComponent,
  ],
  templateUrl: './restriction-manager.component.html',
  styleUrl: './restriction-manager.component.scss',
})
export class RestrictionManagerComponent implements OnInit {
  @Input() restrictions: Restriction[] = [] as Restriction[]
  @Output() sendRestrictions = new EventEmitter<Restriction[]>()
  @Input() activity!: Activity
  @Input() index = 0

  isOpenProposition = false

  @Input() courseMembers: CourseMember[] = []
  @Input() courseGroups: CourseGroup[] = []

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.changeDetectorRef.markForCheck()
  }

  emitRestrictions() {
    this.sendRestrictions.emit(this.restrictions)
  }

  CantAddRestriction(type: string): boolean {
    return this.restrictions.some((restriction) => restriction.type === type)
  }

  addRestriction(type: string): void {
    let newRestriction: Restriction
    if (this.CantAddRestriction(type)) {
      return
    }
    switch (type) {
      case 'DateRange':
        newRestriction = {
          type: 'DateRange',
          config: { start: undefined, end: undefined },
        }
        break
      case 'Correctors':
        newRestriction = {
          type: 'Correctors',
          config: { correctors: [] },
        }
        break
      case 'Groups':
        newRestriction = {
          type: 'Groups',
          config: { groups: [] },
        }
        break
      case 'Members':
        newRestriction = {
          type: 'Members',
          config: { members: [] },
        }
        break
      default:
        console.error(`Type de restriction non supporté: ${type}`)
        return
    }

    this.restrictions.push(newRestriction)
    this.changeDetectorRef.markForCheck()
  }

  removeRestriction(index: number) {
    this.restrictions.splice(index, 1)
    this.changeDetectorRef.markForCheck()
  }

  removeAllRestrictions() {
    this.restrictions = []
    this.emitRestrictions()
    this.changeDetectorRef.markForCheck()
  }
  openBottomSheet() {
    this.isOpenProposition = true
    this.changeDetectorRef.markForCheck()
  }

  closeBottomSheet() {
    this.isOpenProposition = false
    this.changeDetectorRef.markForCheck()
  }

  selectOption(type: string) {
    this.isOpenProposition = false
    if (type) {
      this.addRestriction(type)
    }
    this.changeDetectorRef.markForCheck()
  }
}
