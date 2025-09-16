import { Injectable } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'

@Injectable({ providedIn: 'root' })
export class SharedResourceTutorialService {

  constructor(
    private readonly shepherd: ShepherdService,
  ) {}

  startIdeTutorial(): void {
    const steps = this.buildSteps()
    this.shepherd.startTutorial(steps, {
      tourName: 'ide-basics',
      useModalOverlay: false
    })
  }

  private buildSteps(): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: 'Apprendre à partager une ressource',
        text: "Le tutoriel est en cours de construction. Il arrive très prochainement.",
        buttons: [
          { text: 'Compris', action: () => this.shepherd.complete() },
          // { text: 'Commencer', action: () => this.shepherd.next() },
          // { text: 'Passer', secondary: true, action: () => this.shepherd.cancel() }
        ]
      },
    ]
    return steps
  }
}