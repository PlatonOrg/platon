import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  inject,
  OnDestroy,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
} from '@angular/core'
import { NzDrawerModule } from 'ng-zorro-antd/drawer'
import { RouterModule } from '@angular/router'
import { firstValueFrom, Subscription } from 'rxjs'

import { MatCardModule } from '@angular/material/card'

import { NzBadgeModule } from 'ng-zorro-antd/badge'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzGridModule } from 'ng-zorro-antd/grid'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzProgressModule } from 'ng-zorro-antd/progress'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzDropDownModule } from 'ng-zorro-antd/dropdown'
import { NzModalComponent, NzModalService } from 'ng-zorro-antd/modal'

import { MatIconModule } from '@angular/material/icon'
import { Activity } from '@platon/feature/course/common'
import { UiModalDrawerComponent } from '@platon/shared/ui'
import { ThemeService } from '@platon/core/browser'
import { ResourceService } from '@platon/feature/resource/browser'
import { CoursePipesModule } from '../../pipes'
import { CourseActivitySettingsComponent } from '../activity-settings/activity-settings.component'
import { CourseItemComponent } from '../course-item/course-item.component'
import { CsvDownloadButtonComponent } from '../csv-download-button/csv-download-button.component'
import { CourseService } from '../../api/course.service'

@Component({
  standalone: true,
  selector: 'course-activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,

    MatIconModule,
    MatCardModule,

    NzGridModule,
    NzIconModule,
    NzBadgeModule,
    NzButtonModule,
    NzToolTipModule,
    NzProgressModule,
    NzToolTipModule,
    NzDropDownModule,

    CoursePipesModule,
    CourseItemComponent,
    CsvDownloadButtonComponent,

    UiModalDrawerComponent,
    NzDrawerModule,
    CourseActivitySettingsComponent,
    NzModalComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CourseActivityCardComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly courseService = inject(CourseService)
  private readonly resourceService = inject(ResourceService)
  private themeSubscription?: Subscription

  @Input() item!: Activity
  @ViewChild('settingsComponent') settingsComponent?: CourseActivitySettingsComponent
  @ViewChild('modal') modal?: UiModalDrawerComponent

  protected showAccessWarningModal = false

  constructor(private modalWarning: NzModalService) {}

  async ngOnInit(): Promise<void> {
    this.themeSubscription = this.themeService.themeChange.subscribe(() => {
      this.cdr.markForCheck()
    })

    if (this.item.colorHue === undefined || this.item.colorHue === null) {
      await firstValueFrom(this.courseService.updateActivity(this.item, { colorHue: -1 }))
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe()
  }

  get color(): string {
    if (this.item.colorHue !== undefined && this.item.colorHue !== null) {
      return this.hueToCSS(this.item.colorHue)
    }

    return this.hueToCSS(-1)
  }

  private get presetColors(): string[] {
    return [
      'var(--brand-color-primary)',
      'var(--brand-background-darker-10)',
      'var(--brand-background-darker-20)',
      'var(--brand-background-darker-30)',
    ]
  }

  private hueToCSS(hue: number): string {
    if (hue < 0) {
      const presetIndex = Math.abs(hue) - 1
      if (presetIndex >= 0 && presetIndex < this.presetColors.length) {
        return this.presetColors[presetIndex]
      }
      return this.presetColors[0]
    }

    const isDark = this.themeService.isDark
    const saturation = isDark ? 40 : 80
    const lightness = isDark ? 40 : 80
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  get completedExercises(): number {
    return Math.floor((this.item.progression * this.item.exerciseCount) / 100)
  }

  protected openTab(url: string): void {
    window.open(url, '_blank')
  }

  get editorUrl(): string {
    return this.resourceService.editorUrl(this.item.resourceId, 'latest')
  }

  /**
   * Méthode principale de sauvegarde avec vérification
   */
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

  /**
   * Effectue la sauvegarde
   */
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

  /**
   * Ferme le modal d'avertissement
   */
  closeAccessWarningModal(): void {
    this.showAccessWarningModal = false
    this.cdr.markForCheck()
  }

  /**
   * Confirme la sauvegarde avec accès restreint
   */
  async confirmRestrictedSave(): Promise<void> {
    this.showAccessWarningModal = false
    await this.performSave()
  }

  protected onSaveRequested(): void {
    this.modal?.close()
  }

  protected onActivityChange(activity: Activity): void {
    this.item = activity
    this.cdr.markForCheck()
  }
}
