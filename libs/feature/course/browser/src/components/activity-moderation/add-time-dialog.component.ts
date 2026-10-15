import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'

export interface AddTimeDialogData {
  /** Noms des élèves sélectionnés. */
  names: string[]
}

@Component({
  selector: 'course-add-time-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Ajouter du temps</h2>
    <mat-dialog-content>
      <p class="recipients">
        {{ data.names.length }} élève{{ data.names.length > 1 ? 's' : '' }} :
        {{ preview }}
      </p>

      <div class="presets">
        @for (preset of presets; track preset) {
        <button mat-stroked-button type="button" [class.active]="minutes() === preset" (click)="minutes.set(preset)">
          +{{ preset }} min
        </button>
        }
      </div>

      <mat-form-field appearance="outline" class="custom">
        <mat-label>Durée personnalisée (minutes)</mat-label>
        <input
          matInput
          type="number"
          min="1"
          max="600"
          [ngModel]="minutes()"
          (ngModelChange)="onMinutesChange($event)"
        />
      </mat-form-field>

      <p class="hint">Le temps s'ajoute à celui déjà accordé à chaque élève.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Annuler</button>
      <button mat-flat-button type="button" [disabled]="!isValid()" (click)="dialogRef.close(minutes() * 60)">
        Ajouter le temps
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .recipients {
        margin: 0 0 1rem;
      }
      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .presets .active {
        border-color: var(--brand-color-primary);
        color: var(--brand-color-primary);
      }
      .custom {
        width: 100%;
      }
      .hint {
        font-size: 0.8rem;
        opacity: 0.7;
        margin: 0;
      }
    `,
  ],
})
export class AddTimeDialogComponent {
  protected readonly data = inject<AddTimeDialogData>(MAT_DIALOG_DATA)
  protected readonly dialogRef = inject<MatDialogRef<AddTimeDialogComponent, number>>(MatDialogRef)

  protected readonly presets = [5, 10, 15, 30]
  protected readonly minutes = signal<number>(10)

  protected get preview(): string {
    const max = 3
    const shown = this.data.names.slice(0, max).join(', ')
    return this.data.names.length > max ? `${shown}…` : shown
  }

  protected onMinutesChange(value: number | string | null): void {
    this.minutes.set(value === null || value === '' ? NaN : Number(value))
  }

  protected isValid(): boolean {
    const value = Number(this.minutes())
    return Number.isFinite(value) && value >= 1 && value <= 600
  }
}
