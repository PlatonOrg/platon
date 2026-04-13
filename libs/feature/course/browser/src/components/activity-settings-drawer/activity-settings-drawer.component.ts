import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  ViewChild,
  input,
  output,
  signal,
  effect,
} from '@angular/core'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzModalService } from 'ng-zorro-antd/modal'

import { Activity } from '@platon/feature/course/common'
import { UiModalDrawerComponent } from '@platon/shared/ui'
import { CourseActivitySettingsComponent } from '../activity-settings/activity-settings.component'

@Component({
  standalone: true,
  selector: 'course-activity-settings-drawer',
  templateUrl: './activity-settings-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzButtonModule, NzIconModule, UiModalDrawerComponent, CourseActivitySettingsComponent],
})
export class CourseActivitySettingsDrawerComponent {
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly modalWarning = inject(NzModalService)

  activity = input<Activity>()
  activityChange = output<Activity>()

  @ViewChild('settingsComponent') settingsComponent?: CourseActivitySettingsComponent
  @ViewChild('modal') modal?: UiModalDrawerComponent

  localActivity = signal<Activity | undefined>(undefined)

  constructor() {
    effect(
      () => {
        this.localActivity.set(this.activity())
      },
      { allowSignalWrites: true }
    )
  }

  open(): void {
    this.modal?.open()
  }

  close(): void {
    this.modal?.close()
  }

  protected async saveSettings(): Promise<void> {
    if (!this.settingsComponent) {
      return
    }

    const hasAccessPeriods = this.settingsComponent.accessPeriodsLength > 0
    const hasOthersRule = this.settingsComponent.hasOthersRule()

    if (hasAccessPeriods && !hasOthersRule) {
      this.showAccessWarning()
      return
    }

    await this.performSave()
  }

  private showAccessWarning(): void {
    this.modalWarning.confirm({
      nzTitle: "Configuration d'accès incomplète",
      nzContent: this.createWarningContent(),
      nzWidth: 600,
      nzOkText: "Confirmer l'accès restreint",
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Modifier les périodes',
      nzOnOk: async () => {
        await this.performSave()
      },
      nzOnCancel: () => {
        // Ne rien faire, rester dans les paramètres
      },
    })
  }

  private createWarningContent(): string {
    return `
      <div class="access-warning-content">
        <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; padding: 16px; background: var(--brand-background-hover); border-radius: 8px; border-left: 4px solid var(--brand-color-primary);">
          <div>
            <h4 style="margin: 0 0 8px 0; color: var(--brand-text-primary);">Certains étudiants n'auront pas accès à cette activité</h4>
          </div>
        </div>

        <p style="color: var(--brand-text-primary); margin: 16px 0 8px 0;"><strong>Situation actuelle :</strong></p>
        <div style="background: var(--brand-background-components); border: 1px solid var(--brand-border-color); border-left: 4px solid var(--brand-color-secondary); border-radius: 6px; padding: 16px; margin: 12px 0 20px 0;">
          Vous avez créé des périodes d'accès spécifiques, mais aucune période "Tous les autres".
        </div>

        <p style="color: var(--brand-text-primary); margin: 16px 0 8px 0;"><strong>Conséquences :</strong></p>
        <div style="background: var(--brand-pastel-red); border: 1px solid var(--brand-border-color-light); border-left: 4px solid var(--brand-text-error); border-radius: 6px; padding: 16px; margin: 12px 0 20px 0;">
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Seuls les étudiants dans vos groupes/listes spécifiés auront accès</li>
            <li>Les nouveaux étudiants n'y auront pas accès automatiquement</li>
          </ul>
        </div>

        <div style="background: var(--brand-pastel-green); border: 1px solid var(--brand-border-color); border-left: 4px solid var(--brand-color-secondary); border-radius: 6px; padding: 16px; margin: 20px 0 0 0;">
          <strong style="color: var(--brand-color-secondary);">Recommandation :</strong>
          Ajoutez une période d'accès avec le type "Tous les autres" si vous voulez que tous les étudiants du cours aient accès à cette activité.
        </div>
      </div>
    `
  }

  private async performSave(): Promise<void> {
    if (!this.settingsComponent) {
      return
    }

    try {
      await this.settingsComponent.update()
      this.cdr.markForCheck()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }

  protected onSaveRequested(): void {
    this.modal?.close()
  }

  protected onActivityChange(activity: Activity): void {
    this.localActivity.set(activity)
    this.activityChange.emit(activity)
    this.cdr.markForCheck()
  }
}
