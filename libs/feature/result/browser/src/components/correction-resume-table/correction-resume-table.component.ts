import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
} from '@angular/core'
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms'
import { ExerciseCorrection } from '@platon/feature/result/common'
import { MatTableModule, MatTableDataSource } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { CorrectionLabelComponent } from '../correction-label/correction-label.component'
import { User } from '@platon/core/common'
import { NzInputModule } from 'ng-zorro-antd/input'
import { MatSort, MatSortModule } from '@angular/material/sort'

@Component({
  standalone: true,
  selector: 'correction-resume-table',
  templateUrl: './correction-resume-table.component.html',
  styleUrls: ['./correction-resume-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatSortModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    CorrectionLabelComponent,
    ReactiveFormsModule,
    NzInputModule,
  ],
})
export class CorrectionResumeTableComponent implements OnChanges, AfterViewInit {
  @ViewChild(MatSort) sort: MatSort = new MatSort()
  @Input()
  data: ExerciseCorrection[] = []

  @Input()
  userMap: Map<string, User> = new Map()

  @Input()
  highlightedGrade?: number | string

  @Output()
  gradeAdjustmentChange = new EventEmitter<{ userId: string; adjustment: number }>()

  @Output()
  correctionsUpdated = new EventEmitter<ExerciseCorrection[]>()

  displayedColumns = ['userId', 'grade', 'labels', 'adjustment']

  // Form for grade adjustments
  gradeForm: FormGroup
  gradeAdjustments = new Map<string, number>()
  protected dataSource: MatTableDataSource<ExerciseCorrection> = new MatTableDataSource<ExerciseCorrection>([])

  hasUnsavedChanges = false

  constructor(private cdr: ChangeDetectorRef, private fb: FormBuilder) {
    this.gradeForm = this.fb.group({})
    this.setupCustomSorting()
  }

  private setupCustomSorting(): void {
    this.dataSource.sortingDataAccessor = (item: ExerciseCorrection, property: string) => {
      switch (property) {
        case 'userId': {
          // Sort by user's full name
          const user = this.userMap.get(item.userId)
          return user ? `${user.firstName} ${user.lastName}` : 'Unknown User'
        }
        case 'grade': {
          // Sort by final grade (including adjustments)
          return this.getFinalGrade(item)
        }
        default:
          return ''
      }
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['highlightedGrade']) {
      this.cdr.markForCheck()
    }
    if (changes['data'] || changes['userMap']) {
      // Use the data directly instead of creating a copy
      this.dataSource = new MatTableDataSource(this.data)
      this.setupCustomSorting()
      this.dataSource.sort = this.sort

      // Reset adjustments and unsaved changes flag when new data arrives
      this.gradeAdjustments.clear()
      this.hasUnsavedChanges = false

      this.cdr.markForCheck()
    }
  }

  getStyle(grade: number | string): { [key: string]: boolean } {
    return {
      'highlighted-grade': this.highlightedGrade === grade,
    }
  }

  getInputStyles(correction: ExerciseCorrection): { [key: string]: string } {
    const adjustment = this.gradeAdjustments.get(correction.userId)
    if (adjustment && adjustment > 0) {
      return {
        color: 'green',
        'font-weight': 'bold',
      }
    } else if (adjustment && adjustment < 0) {
      return {
        color: 'red',
        'font-weight': 'bold',
      }
    }
    return {
      color: 'black',
      'font-weight': 'normal',
    }
  }

  saveEditInput(correction: ExerciseCorrection, inputElement: HTMLInputElement): void {
    const value = inputElement.value.trim()

    // Clear adjustment if empty or default placeholder
    if (value === '' || value === '+/-0') {
      const _previousValue = (this.gradeAdjustments.get(correction.userId) ?? 0) * -1
      this.gradeAdjustments.delete(correction.userId)
      this.hasUnsavedChanges = true
      this.cdr.markForCheck()
      return
    }

    // Parse the adjustment value with better validation
    let adjustment = 0

    // Handle different input formats: +5, -3, 5, 3
    if (value.startsWith('+')) {
      adjustment = parseFloat(value.substring(1))
    } else if (value.startsWith('-')) {
      adjustment = parseFloat(value)
    } else {
      adjustment = parseFloat(value)
      // If positive number without sign, treat as positive adjustment
      if (adjustment > 0) {
        inputElement.value = `+${adjustment}`
      }
    }

    // Validate the parsed number
    if (!isNaN(adjustment) && isFinite(adjustment)) {
      // Ensure reasonable bounds (e.g., -100 to +100)
      adjustment = Math.max(-100, Math.min(100, adjustment))

      if (this.gradeAdjustments.get(correction.userId) === adjustment) return
      this.gradeAdjustments.set(correction.userId, adjustment)
      this.hasUnsavedChanges = true
      this.gradeAdjustmentChange.emit({ userId: correction.userId, adjustment })

      // Update input display with proper formatting
      inputElement.value = this.getAdjustmentValue(correction)

      // Refresh sorting since grades have changed
      this.refreshSorting()
    } else {
      // Reset to previous value if invalid
      inputElement.value = this.getAdjustmentValue(correction)
    }

    this.cdr.markForCheck()
  }

  private refreshSorting(): void {
    if (this.dataSource.sort && this.dataSource.sort.active === 'grade') {
      // Trigger re-sort if currently sorting by grade
      this.dataSource.sort.sort({
        id: 'grade',
        start: this.dataSource.sort.direction || 'asc',
        disableClear: false,
      })
    }
  }

  getAdjustmentValue(correction: ExerciseCorrection): string {
    const adjustment = this.gradeAdjustments.get(correction.userId)
    if (adjustment === undefined || adjustment === 0) {
      return ''
    }
    return adjustment > 0 ? `+${adjustment}` : `${adjustment}`
  }

  /**
   * Calculate the final grade including any adjustments
   */
  getFinalGrade(correction: ExerciseCorrection): number {
    const originalGrade = correction.correctedGrade ?? correction.grade ?? 0
    const adjustment = this.gradeAdjustments.get(correction.userId) ?? 0
    return Math.max(0, Math.min(100, originalGrade + adjustment))
  }

  /**
   * Get display text for the grade column showing both original and adjusted grade
   */
  getGradeDisplayText(correction: ExerciseCorrection): string {
    const originalGrade = correction.correctedGrade ?? correction.grade ?? 0
    const adjustment = this.gradeAdjustments.get(correction.userId)

    if (!adjustment || adjustment === 0) {
      return originalGrade.toString()
    }

    const finalGrade = this.getFinalGrade(correction)
    return `${originalGrade} → ${finalGrade}`
  }

  /**
   * Save all modifications and emit the updated corrections to parent
   */
  saveModifications(): void {
    const updatedCorrections = this.data.map((correction) => {
      const adjustment = this.gradeAdjustments.get(correction.userId)
      if (adjustment !== undefined && adjustment !== 0) {
        const finalGrade = this.getFinalGrade(correction)
        return {
          ...correction,
          correctedGrade: finalGrade,
        }
      }
      return correction
    })

    this.correctionsUpdated.emit(updatedCorrections)
    this.hasUnsavedChanges = false
    this.cdr.markForCheck()
  }

  /**
   * Reset all modifications and go back to original data
   */
  resetModifications(): void {
    this.gradeAdjustments.clear()
    this.hasUnsavedChanges = false
    this.dataSource.data = this.data
    this.refreshSorting()
    this.cdr.markForCheck()
  }

  /**
   * Check if there are any modifications that differ from original data
   */
  getModificationCount(): number {
    return this.gradeAdjustments.size
  }
}
