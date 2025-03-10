import { Component, EventEmitter, Output } from '@angular/core'
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
  showDateForm = false

  menuItems = [
    { title: 'Date', description: 'Empêcher l’accès jusqu’à (ou à partir) d’une date et heure donnée.' },
    { title: 'Correcteurs', description: 'Requiert l’atteinte d’une note minimale par les étudiants' },
    {
      title: 'Groupe',
      description: 'N’autoriser que les étudiants membres d’un groupe spécifié ou de tous les groupes.',
    },
    { title: 'Membres', description: 'Contrôle l’accès sur la base des champs du profil de l’étudiant' },
    {
      title: 'Jeu de restriction',
      description: 'Ajouter un jeu de restrictions imbriquées pour obtenir une logique complexe.',
    },
  ]

  close() {
    this.closeEvent.emit()
  }

  sendAndClose(type: string) {
    switch (type) {
      case 'Date':
        this.sendEvent.emit('DateRange')
        break
      case 'Correcteurs':
        this.sendEvent.emit('Correctors')
        break
      case 'Groupe':
        this.sendEvent.emit('Group')
        break
      case 'Membres':
        this.sendEvent.emit('Members')
        break
      case 'Jeu de restriction':
        this.sendEvent.emit('Jeu')
        break
      default:
        break
    }
    //this.sendEvent.emit(type)
    this.close()
  }
}
