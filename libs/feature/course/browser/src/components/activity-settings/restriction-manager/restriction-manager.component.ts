import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzCardModule } from 'ng-zorro-antd/card'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { NzGridModule } from 'ng-zorro-antd/grid'

import { saveAs } from 'file-saver'

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
  @Output() notRestriction = new EventEmitter<void>() // Si l'utilisateur supprime la dernière restriction, on envoie un événement pour mettre à jour l'affichage
  @Output() restrictionAdded = new EventEmitter<void>()
  @Input() restrictions: Restriction[] = [] as Restriction[]
  @Input() condition?: 'must' | 'mustNot' = 'must'
  @Input() allConditions?: 'all' | 'any' = 'all'
  @Input() isSubRestriction = false
  @Input() isStart = false
  @Output() sendRestrictions = new EventEmitter<Restriction[]>()
  @Input() activity!: Activity

  isOpenProposition = false
  selectedType = ''

  @Input() courseMembers: CourseMember[] = []
  @Input() courseGroups: CourseGroup[] = []

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}
  ngOnInit(): void {
    console.log('Restrictions in manager \n\n:', this.restrictions)
    this.changeDetectorRef.markForCheck()
  }

  saveDataToFile(): Restriction[] {
    const data = {
      condition: this.condition,
      allConditions: this.allConditions,
      restrictions: this.restrictions,
    }

    const traverseRestrictions = (restrictions: Restriction[]): any[] => {
      return restrictions.map((restriction) => {
        if (restriction.type === 'Jeu') {
          return {
            condition: restriction.condition,
            allConditions: restriction.allConditions,
            restrictions: traverseRestrictions(restriction.restrictions || []),
          }
        } else {
          return {
            type: restriction.type,
            config: restriction.config,
          }
        }
      })
    }

    data.restrictions = traverseRestrictions(this.restrictions)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const fileName = 'restrictions.json'
    saveAs(blob, fileName)
    return data.restrictions
  }

  emitRestrictions() {
    const res = this.saveDataToFile()
    this.sendRestrictions.emit(this.restrictions)
  }

  @Input() set type(value: string) {
    if (value) {
      this.addRestriction(value)
    }
  }

  @Input() set start(value: boolean) {
    if (value) {
      this.isStart = value
    }
  }

  @Input() set sendRestrictionToParent(value: boolean) {
    if (value) {
      this.emitRestrictions()
      console.log('Restrictions envoyées au parent')
      this.changeDetectorRef.markForCheck()
    }
  }

  addRestriction(type: string): void {
    let newRestriction: Restriction

    switch (type) {
      case 'Date':
        newRestriction = {
          type: 'DateRange',
          config: { start: undefined, end: undefined },
        }
        break
      case 'Correcteurs':
        newRestriction = {
          type: 'Correctors',
          config: { correctors: [] },
        }
        break
      case 'Groupe':
        newRestriction = {
          type: 'Group',
          config: { groups: [] },
        }
        break
      case 'Membres':
        newRestriction = {
          type: 'Members',
          config: { members: [] },
        }
        break
      case 'Jeu de restriction':
        newRestriction = {
          type: 'Jeu',
          config: {},
          restrictions: [],
          condition: this.condition,
          allConditions: this.allConditions,
        }
        break
      default:
        throw new Error(`Type de restriction non supporté: ${type}`)
    }

    this.restrictions.push(newRestriction)
    this.restrictionAdded.emit()
    this.changeDetectorRef.markForCheck()
  }

  removeRestriction(index: number) {
    this.restrictions.splice(index, 1)
    if (this.restrictions.length === 0) {
      this.notRestriction.emit()
    }
    this.changeDetectorRef.markForCheck()
  }

  onSubRestrictionAdded(parentIndex: number) {
    const parentRestriction = this.restrictions[parentIndex]

    if (parentRestriction.type === 'Jeu') {
      parentRestriction.restrictions = parentRestriction.restrictions || []

      let newSubRestriction: Restriction
      switch (this.selectedType) {
        case 'Date':
          newSubRestriction = {
            type: 'DateRange',
            config: { start: undefined, end: undefined },
          }
          break
        case 'Correcteurs':
          newSubRestriction = {
            type: 'Correctors',
            config: { correctors: [] },
          }
          break
        case 'Groupe':
          newSubRestriction = { type: 'Group', config: { groups: [] } }
          break
        case 'Membres':
          newSubRestriction = {
            type: 'Members',
            config: { members: [] },
          }
          break
        case 'Jeu de restriction':
          newSubRestriction = {
            type: 'Jeu',
            config: {},
            condition: parentRestriction.condition,
            allConditions: parentRestriction.allConditions,
            restrictions: [],
          }
          break
        default:
          return
      }
      parentRestriction.restrictions.push(newSubRestriction)
    }
    this.selectedType = ''
    this.restrictionAdded.emit()
    this.changeDetectorRef.detectChanges()
  }

  onSubRestrictionRemoved(parentIndex: number, subIndex: number) {
    const parentRestriction = this.restrictions[parentIndex]

    if (parentRestriction.type === 'Jeu' && parentRestriction.restrictions) {
      parentRestriction.restrictions.splice(subIndex, 1)

      if (parentRestriction.restrictions.length === 0) {
        parentRestriction.restrictions = []
        console.log('Toutes les sous-restrictions ont été supprimées.')
      }

      this.restrictionAdded.emit()
    }
  }

  openBottomSheet() {
    this.isOpenProposition = true
    this.changeDetectorRef.markForCheck()
  }

  closeBottomSheet() {
    this.isOpenProposition = false
    this.changeDetectorRef.markForCheck()
  }

  selectOption(parentIndex: number, type: string) {
    this.selectedType = type
    this.isOpenProposition = false

    if (this.selectedType) {
      this.onSubRestrictionAdded(parentIndex)
    }
    this.changeDetectorRef.markForCheck()
  }
}
