import { Component, Input, inject } from '@angular/core'

import { TutorialSelectorService, TutorialOption } from '../../api/tutorial-selector.service'
import { MatIconModule } from '@angular/material/icon'
import { NzGridModule } from 'ng-zorro-antd/grid'

@Component({
  selector: 'tutorial-selector-modal',
  imports: [MatIconModule, NzGridModule],
  templateUrl: './tutorial-selector-modal.component.html',
  styleUrl: './tutorial-selector-modal.component.scss',
})
export class TutorialSelectorModalComponent {
  protected tutorialService = inject(TutorialSelectorService)

  @Input() tutorials: TutorialOption[] = []

  constructor() {
    this.tutorials = this.tutorialService.tutorials
  }

  selectTutorial(tutorialId: string): void {
    void this.tutorialService.startTutorial(tutorialId)
  }

  onOverlayClick(): void {
    this.tutorialService.closeTutorialSelector()
  }
}
