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

  protected emitRestrictions() {
    this.sendRestrictions.emit(this.restrictions)
  }

  protected CantAddRestriction(type: string): boolean {
    return this.restrictions.some((restriction) => restriction.type === type)
  }

  private removeGroupsAndUsers(): void {
    this.restrictions = this.restrictions.filter(
      (restriction) => restriction.type !== 'Groups' && restriction.type !== 'Members'
    )
  }

  protected containsCorrectorsAndOthers(): boolean {
    return (
      this.restrictions.some((restriction) => restriction.type === 'Correctors') &&
      this.restrictions.some((restriction) => restriction.type === 'Others')
    )
  }

  private addRestriction(type: string): void {
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
      case 'Others':
        newRestriction = {
          type: 'Others',
          config: { enabled: true },
        }
        this.removeGroupsAndUsers()
        break
      default:
        console.error(`Type de restriction non supporté: ${type}`)
        return
    }

    this.restrictions.push(newRestriction)
    this.emitRestrictions()
    this.changeDetectorRef.markForCheck()
  }

  protected removeRestriction(index: number) {
    this.restrictions.splice(index, 1)
    this.emitRestrictions()
    this.changeDetectorRef.markForCheck()
  }

  protected removeAllRestrictions() {
    this.restrictions = []
    this.emitRestrictions()
    this.changeDetectorRef.markForCheck()
  }

  protected openBottomSheet() {
    this.isOpenProposition = true
    this.changeDetectorRef.markForCheck()
  }

  protected closeBottomSheet() {
    this.isOpenProposition = false
    this.changeDetectorRef.markForCheck()
  }

  protected selectOption(type: string) {
    this.isOpenProposition = false
    if (type) {
      this.addRestriction(type)
    }
    this.changeDetectorRef.markForCheck()
  }

  get typesRestrictionPresent(): string[] {
    return this.restrictions.map((restriction) => restriction.type)
  }
}
