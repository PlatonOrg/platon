import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { TutorialSelectorService, TutorialOption } from '../../api/tutorial-selector.service'
import { AuthService } from '@platon/core/browser'
import { MatIconModule } from '@angular/material/icon'
import {NzGridModule} from 'ng-zorro-antd/grid'

@Component({
  selector: 'tutorial-selector-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, NzGridModule],
  templateUrl: './tutorial-selector-modal.component.html',
  styleUrl: './tutorial-selector-modal.component.scss',
})
export class TutorialSelectorModalComponent {
  @Input() tutorials: TutorialOption[] = [];

  constructor(
    public tutorialService: TutorialSelectorService,
    private authService: AuthService
  ) {
    this.tutorials = this.tutorialService.tutorials;
  }

  selectTutorial(tutorialId: string): void {
    this.tutorialService.startTutorial(tutorialId);
  }

  onOverlayClick(): void {
    this.tutorialService.closeTutorialSelector();
  }
}
