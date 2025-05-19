import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzCardModule } from 'ng-zorro-antd/card'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { NzGridModule } from 'ng-zorro-antd/grid'

// import { saveAs } from 'file-saver'

import { PropositionsComponent } from '../propositions/propositions.component'
import { RestrictionComponent } from '../restriction/restriction.component'
import { Activity, CourseGroup, CourseMember, Restriction } from '@platon/feature/course/common'
import index from 'isomorphic-git'

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
  @Input() isStart = false
  @Output() sendRestrictions = new EventEmitter<Restriction[]>()
  @Input() activity!: Activity
  @Input() isMainRestriction = false
  @Input() index = 0

  isOpenProposition = false
  selectedType = ''

  @Input() courseMembers: CourseMember[] = []
  @Input() courseGroups: CourseGroup[] = []

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.changeDetectorRef.markForCheck()
  }

  //saveDataToFile(): Restriction[] {
  // const data = {
  //   condition: this.condition,
  //   allConditions: this.allConditions,
  //   restrictions: this.restrictions,
  // }
  // const traverseRestrictions = (restrictions: Restriction[]): any[] => {
  //   return restrictions.map((restriction) => {
  //     if (restriction.type === 'Jeu') {
  //       return {
  //         condition: restriction.condition,
  //         allConditions: restriction.allConditions,
  //         restrictions: traverseRestrictions(restriction.restrictions || []),
  //       }
  //     } else {
  //       return {
  //         type: restriction.type,
  //         config: restriction.config,
  //       }
  //     }
  //   })
  // }
  // data.restrictions = traverseRestrictions(this.restrictions)
  //const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  //const fileName = 'restrictions.json'
  //saveAs(blob, fileName)
  //return data.restrictions
  //}

  emitRestrictions() {
    //const res = this.saveDataToFile()
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

  CantAddRestriction(type: string): boolean {
    return this.restrictions.some((restriction) => restriction.type === type)
  }

  addRestriction(type: string): void {
    let newRestriction: Restriction
    if (this.CantAddRestriction(type)) {
      console.log('Cette restriction existe déjà.')
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
        //throw new Error(`Type de restriction non supporté: ${type}`)
        console.error(`Type de restriction non supporté: ${type}`)
        return
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

  openBottomSheet() {
    this.isOpenProposition = true
    this.changeDetectorRef.markForCheck()
  }

  closeBottomSheet() {
    this.isOpenProposition = false
    this.changeDetectorRef.markForCheck()
  }

  selectOption(type: string) {
    this.selectedType = type
    this.isOpenProposition = false

    if (this.selectedType) {
      this.addRestriction(this.selectedType)
      this.selectedType = ''
    }
    this.changeDetectorRef.markForCheck()
  }
}
