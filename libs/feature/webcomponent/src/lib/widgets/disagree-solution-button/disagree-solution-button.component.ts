import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core'
import { DialogService } from '@platon/core/browser'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { DisagreeSolutionButtonComponentDefinition, DisagreeSolutionButtonState } from './disagree-solution-button'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'

@Component({
  selector: 'wc-disagree-solution-button',
  templateUrl: 'disagree-solution-button.component.html',
  styleUrls: ['disagree-solution-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
@WebComponent(DisagreeSolutionButtonComponentDefinition)
export class DisagreeSolutionButtonComponent implements WebComponentHooks<DisagreeSolutionButtonState> {
  @Input() state!: DisagreeSolutionButtonState

  constructor(
    readonly injector: Injector,
    private readonly dialogService: DialogService,
    private readonly http: HttpClient
  ) {}

  async onDisagreeClick(): Promise<void> {
    try {
      const confirmed = await this.dialogService.confirm({
        nzTitle: 'Signaler un problème avec la solution',
        nzContent: `
          Êtes-vous sûr de vouloir signaler que cette solution vous semble incorrecte ?
          <br/>
          <i>Une notification sera envoyée au créateur de l'exercice pour qu'il puisse vérifier la solution.</i>
        `,
        nzOkText: 'Oui, signaler',
        nzCancelText: 'Annuler',
        nzOkDanger: true
      })

      if (!confirmed) {
        return
      }

      // Send the disagreement to the backend
      await firstValueFrom(
        this.http.post('/api/v1/player/disagree-solution', {
          sessionId: this.state.sessionId
        })
      )

      this.dialogService.success('Votre signalement a été envoyé au créateur de l\'exercice. Merci pour votre retour.')

      this.state.disabled = true
    } catch (error) {
      console.error('Error sending solution disagreement:', error)
      this.dialogService.error('Une erreur est survenue lors de l\'envoi du signalement. Veuillez réessayer.')
    }
  }
}