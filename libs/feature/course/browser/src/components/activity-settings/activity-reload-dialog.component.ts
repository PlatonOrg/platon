import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import {
  ActivityReloadExercise,
  ActivityReloadPreview,
  ReloadActivity,
  ReloadExerciseRisk,
  ReloadExerciseStatus,
} from '@platon/feature/course/common'

@Component({
  selector: 'course-activity-reload-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>Recharger l'activité</h2>
    <mat-dialog-content>
      @if (data.fullReset) {
      <p class="warning">
        Cette activité est en mode « évaluation par les pairs » : si un exercice a changé, les données de
        <strong>tous les exercices</strong> seront effacées.
      </p>
      } @if (changed.length === 0) {
      <p>Aucun exercice n'a changé depuis le dernier chargement. Aucune donnée ne sera effacée.</p>
      } @else if (!data.fullReset) {
      <p>
        {{ changed.length }} exercice{{ changed.length > 1 ? 's ont' : ' a' }} changé. Seules les données des exercices
        rechargés qui ont changé seront effacées.
      </p>
      }

      <ul class="exercises">
        @for (exercise of data.exercises; track exercise.key) {
        <li>
          @if (choosing()) {
          <mat-checkbox
            [disabled]="exercise.status === 'unchanged'"
            [checked]="isSelected(exercise)"
            (change)="toggle(exercise, $event.checked)"
          >
            {{ exercise.title }}
          </mat-checkbox>
          } @else {
          <span class="title">{{ exercise.title }}</span>
          }
          <span class="status" [class.changed]="exercise.status !== 'unchanged'">{{ labels[exercise.status] }}</span>
          @if (exercise.status !== 'unchanged' && exercise.status !== 'added' && exercise.startedCount > 0) {
          <span class="started">
            {{ exercise.startedCount }} élève{{ exercise.startedCount > 1 ? 's ont' : ' a' }} déjà répondu
          </span>
          } @if (choosing() && exercise.status === 'modified' && isSelected(exercise)) {
          <div class="details">
            <mat-checkbox [checked]="isKept(exercise)" (change)="toggleKept(exercise, $event.checked)">
              Garder les réponses des élèves
            </mat-checkbox>
            @if (exercise.changedVariables.length) {
            <span class="variables">Variables modifiées : {{ exercise.changedVariables.join(', ') }}</span>
            } @if (isKept(exercise) && exercise.risks.length) {
            <p class="warning">
              Attention, {{ describeRisks(exercise) }} : les réponses et les notes déjà données peuvent ne plus
              correspondre au nouvel exercice.
            </p>
            }
          </div>
          }
        </li>
        }
      </ul>

      @if (keptKeys().length > 0) {
      <p class="warning">
        <strong>Garder les réponses comporte des risques :</strong> à utiliser uniquement pour une correction de forme
        (faute dans l'énoncé, nom de l'exercice…). Seules les variables que l'exercice de l'élève n'a pas modifiées sont
        mises à jour. Les notes ne sont pas recalculées et les réponses déjà données gardent l'ancienne version.
      </p>
      } @if (!data.fullReset && destroyedCount() > 0) {
      <p class="warning">
        <strong>Irréversible :</strong> {{ destroyedCount() }} copie{{ destroyedCount() > 1 ? 's' : '' }} d'élève
        (réponses et notes) sur ces exercices {{ destroyedCount() > 1 ? 'seront effacées' : 'sera effacée' }}.
      </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Annuler</button>
      @if (choosing()) {
      <button
        mat-flat-button
        type="button"
        (click)="dialogRef.close({ exerciseKeys: selectedKeys(), keepAnswersKeys: keptKeys() })"
      >
        Recharger la sélection ({{ selectedKeys().length }})
      </button>
      } @else { @if (!data.fullReset && changed.length > 0) {
      <button mat-stroked-button type="button" (click)="choosing.set(true)">Choisir les exercices</button>
      }
      <button mat-flat-button type="button" (click)="dialogRef.close({ exerciseKeys: changedKeys })">
        Recharger les exercices modifiés ({{ changed.length }})
      </button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      .exercises {
        list-style: none;
        margin: 1rem 0;
        padding: 0;
      }
      .exercises li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0;
      }
      .title {
        flex: 1 1 auto;
      }
      .status {
        font-size: 0.8rem;
        opacity: 0.7;
      }
      .status.changed {
        color: var(--brand-color-primary);
        font-weight: 600;
        opacity: 1;
      }
      .started,
      .variables {
        font-size: 0.8rem;
      }
      .details {
        display: flex;
        flex: 1 1 100%;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        padding-left: 2rem;
      }
      .details .warning {
        flex: 1 1 100%;
        margin: 0;
      }
      .warning {
        color: #d4380d;
      }
    `,
  ],
})
export class ActivityReloadDialogComponent {
  protected readonly data = inject<ActivityReloadPreview>(MAT_DIALOG_DATA)
  protected readonly dialogRef = inject<MatDialogRef<ActivityReloadDialogComponent, ReloadActivity>>(MatDialogRef)

  protected readonly labels: Record<ReloadExerciseStatus, string> = {
    unchanged: 'Inchangé',
    modified: 'Modifié',
    added: 'Ajouté',
    removed: 'Retiré',
  }

  protected readonly changed = this.data.exercises.filter((exercise) => exercise.status !== 'unchanged')
  /**
   * Keys always sent explicitly: if the resource is published again after the preview,
   * the server must not destroy the data of exercises that were not shown.
   */
  protected readonly changedKeys = this.changed.map((exercise) => exercise.key)
  protected readonly choosing = signal(false)
  protected readonly selectedKeys = signal(this.changedKeys)
  private readonly keepAnswersKeys = signal<string[]>([])

  /** Selected exercises reloaded while keeping the answers of the students. */
  protected readonly keptKeys = computed(() => {
    const selected = this.selectedKeys()
    return this.keepAnswersKeys().filter((key) => selected.includes(key))
  })

  /** Number of student copies that the current choice destroys. */
  protected readonly destroyedCount = computed(() => {
    const keys = this.selectedKeys()
    const kept = this.keptKeys()
    return this.data.exercises
      .filter(
        (exercise) => exercise.status !== 'unchanged' && keys.includes(exercise.key) && !kept.includes(exercise.key)
      )
      .reduce((total, exercise) => total + exercise.startedCount, 0)
  })

  private readonly riskLabels: Record<ReloadExerciseRisk, string> = {
    builder: 'le builder',
    grader: 'le grader',
    files: 'les fichiers inclus',
  }

  protected isSelected(exercise: ActivityReloadExercise): boolean {
    return this.selectedKeys().includes(exercise.key)
  }

  protected toggle(exercise: ActivityReloadExercise, checked: boolean): void {
    this.selectedKeys.update((keys) => (checked ? [...keys, exercise.key] : keys.filter((key) => key !== exercise.key)))
  }

  protected isKept(exercise: ActivityReloadExercise): boolean {
    return this.keptKeys().includes(exercise.key)
  }

  protected toggleKept(exercise: ActivityReloadExercise, checked: boolean): void {
    this.keepAnswersKeys.update((keys) =>
      checked ? [...keys, exercise.key] : keys.filter((key) => key !== exercise.key)
    )
  }

  protected describeRisks(exercise: ActivityReloadExercise): string {
    const labels = exercise.risks.map((risk) => this.riskLabels[risk])
    const text = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}` : labels[0]
    const plural = labels.length > 1 || exercise.risks[0] === 'files'
    return `${text} ${plural ? 'ont' : 'a'} changé`
  }
}
