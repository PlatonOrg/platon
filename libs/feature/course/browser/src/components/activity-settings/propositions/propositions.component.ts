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

  protected menuItems = [
    { title: 'Date', description: 'Empêcher l’accès jusqu’à (ou à partir) d’une date et heure donnée.' },
    { title: 'Correcteurs', description: 'Ajouter des correcteurs spécifiques à l’activité.' },
    {
      title: 'Groupe',
      description: 'Ajouter un groupe spécifique pour l’activité.',
    },
    { title: 'Membres', description: 'Ajouter des membres spécifiques à l’activité.' },
  ]

  protected close() {
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
        this.sendEvent.emit('Groups')
        break
      case 'Membres':
        this.sendEvent.emit('Members')
        break
      default:
        break
    }
    this.close()
  }
}
