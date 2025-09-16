import { Component, EventEmitter, Output, input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NzDrawerModule } from 'ng-zorro-antd/drawer'
import { NzListModule } from 'ng-zorro-antd/list'
import { NzModalModule } from 'ng-zorro-antd/modal'

@Component({
  selector: 'course-propositions',
  standalone: true,
  imports: [CommonModule, NzDrawerModule, NzListModule, NzModalModule],
  templateUrl: './propositions.component.html',
  styleUrl: './propositions.component.scss',
})
export class PropositionsComponent {
  @Output() closeEvent = new EventEmitter<void>()
  @Output() sendEvent = new EventEmitter<string>()
  typesRequired = input.required<string[]>()

  protected menuItems = [
    {
      type: 'DateRange',
      title: 'Période temporelle',
      description: 'Définir une plage de dates pendant laquelle cette période est active.',
    },
    {
      type: 'Members',
      title: 'Utilisateurs spécifiques',
      description: 'Sélectionner des utilisateurs précis qui auront accès pendant cette période.',
    },
    {
      type: 'Groups',
      title: 'Groupes spécifiques',
      description: 'Sélectionner des groupes entiers qui auront accès pendant cette période.',
    },
    {
      type: 'Correctors',
      title: 'Correcteurs',
      description: "Désigner des correcteurs spécifiques pour cette période d'accès.",
    },
    {
      type: 'Others',
      title: 'Tous les autres',
      description: "Inclure automatiquement tous les utilisateurs qui ne sont dans aucune autre période d'accès.",
    },
  ]

  get propositions() {
    if (this.typesRequired().includes('Others')) {
      return this.menuItems.filter((item) => item.type === 'Correctors')
    }
    return this.menuItems.filter((item) => !this.typesRequired().includes(item.type))
  }

  protected close() {
    this.closeEvent.emit()
  }

  protected sendAndClose(type: string) {
    this.sendEvent.emit(type)
    this.close()
  }
}
