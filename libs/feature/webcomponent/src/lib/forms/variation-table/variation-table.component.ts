import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core'
import { MathfieldElement } from 'mathlive'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import { BaseModule } from '../../shared/components/base/base.module'
import { VariationTableComponentDefinition, type VariationTableState } from './variation-table'
import {
  TableauArrow,
  TableauRow,
  arrowGeometry,
  canInsert,
  canRemove,
  canToggleColumn,
  describeCell,
  insertPoint,
  isColumnSplit,
  isLocked,
  isNormalized,
  isSplit,
  nextArrow,
  nextMark,
  nextSign,
  normalizeRows,
  pointLevel,
  pointText,
  removePoint,
  setPointText,
  toggleColumnSplit,
} from './variation-table.utils'

let instances = 0

@Component({
  selector: 'wc-variation-table',
  templateUrl: 'variation-table.component.html',
  styleUrls: ['variation-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
@WebComponent(VariationTableComponentDefinition)
export class VariationTableComponent implements OnInit, WebComponentHooks<VariationTableState> {
  readonly injector = inject(Injector)
  readonly changeDetector = inject(WebComponentChangeDetectorService)

  @Input() state!: VariationTableState
  @Output() stateChange = new EventEmitter<VariationTableState>()

  /** Identifiant de la pointe de flèche SVG, unique dans la page. */
  protected readonly markerId = `wc-tv-head-${++instances}`

  protected readonly isSplit = isSplit
  protected readonly pointText = pointText

  constructor() {
    MathfieldElement.fontsDirectory = 'assets/vendors/mathlive/fonts'
  }

  ngOnInit() {
    this.state.isFilled = false
  }

  onChangeState() {
    this.state.minPoints = Math.max(2, Math.floor(Number(this.state.minPoints) || 2))
    this.state.maxPoints = Math.max(this.state.minPoints, Math.floor(Number(this.state.maxPoints) || 8))
    this.state.rows = normalizeRows(this.state.rows, this.state.minPoints)
  }

  /**
   * Lignes à afficher. Le rendu a lieu avant onChangeState() : un tableau écrit à la main par l'auteur
   * (lignes sans `points` ni `intervals`) est affiché à partir d'une copie normalisée.
   */
  protected rows(): TableauRow[] {
    const rows = this.state.rows
    return isNormalized(rows, this.state.minPoints) ? rows : normalizeRows(rows, this.state.minPoints)
  }

  /** Grille CSS : intitulés, puis alternance valeur de x / intervalle. */
  protected columns(): string {
    const n = this.rows()[0].points.length
    return `minmax(3.5em, max-content) repeat(${n - 1}, minmax(3.2em, max-content) minmax(4.5em, 1fr)) minmax(3.2em, max-content)`
  }

  protected readonly(row: TableauRow, kind: 'p' | 'i', index: number): boolean {
    return this.state.disabled || isLocked(row, kind, index)
  }

  protected level(row: TableauRow, index: number, side = 0): number {
    return pointLevel(row, index, side) + 1
  }

  protected arrow(row: TableauRow, index: number): TableauArrow | null {
    return arrowGeometry(row, index)
  }

  protected label(row: TableauRow, kind: 'p' | 'i', index: number): string {
    return describeCell(row, kind, index)
  }

  protected signText(sign: string): string {
    return sign === '-' ? '−' : sign
  }

  protected showTools(): boolean {
    return (
      !this.state.disabled &&
      (this.state.resizable || (this.state.forbidden && this.rows().some((row) => row.type === 'variation')))
    )
  }

  protected canSplitColumn(index: number): boolean {
    return this.state.forbidden && !this.state.disabled && canToggleColumn(this.rows(), index)
  }

  protected isColumnSplit(index: number): boolean {
    return isColumnSplit(this.rows(), index)
  }

  protected canInsert(index: number): boolean {
    return this.state.resizable && !this.state.disabled && canInsert(this.rows(), index, this.state.maxPoints)
  }

  protected canRemove(index: number): boolean {
    return this.state.resizable && !this.state.disabled && canRemove(this.rows(), index, this.state.minPoints)
  }

  protected cycleSign(r: number, index: number): void {
    this.edit(r, 'i', index, (row) => (row.intervals[index] = nextSign(row.intervals[index])))
  }

  protected cycleMark(r: number, index: number): void {
    this.edit(r, 'p', index, (row) => (row.points[index] = nextMark(pointText(row.points[index]), this.state.forbidden)))
  }

  protected cycleArrow(r: number, index: number): void {
    this.edit(r, 'i', index, (row) => (row.intervals[index] = nextArrow(row.intervals[index])))
  }

  protected toggleColumn(index: number): void {
    if (!this.canSplitColumn(index)) return
    this.update((rows) => toggleColumnSplit(rows, index))
  }

  protected onValue(r: number, index: number, side: number, event: Event): void {
    const value = (event.target as MathfieldElement).value
    if (pointText(this.rows()[r]?.points[index], side) === value) return
    this.edit(r, 'p', index, (target) => setPointText(target, index, side, value))
  }

  protected insert(index: number): void {
    if (!this.canInsert(index)) return
    this.update((rows) => insertPoint(rows, index))
  }

  protected remove(index: number): void {
    if (!this.canRemove(index)) return
    this.update((rows) => removePoint(rows, index))
  }

  private edit(r: number, kind: 'p' | 'i', index: number, action: (row: TableauRow) => void): void {
    const row = this.rows()[r]
    if (!row || this.readonly(row, kind, index)) return
    this.update((rows) => action(rows[r]))
  }

  /**
   * Modifie une copie des lignes puis la remplace d'un coup : chaque écriture dans `state` passe par le
   * proxy de @WebComponent et relance la détection de changements.
   */
  private update(action: (rows: TableauRow[]) => void): void {
    const rows = JSON.parse(JSON.stringify(this.rows())) as TableauRow[]
    action(rows)
    this.changeDetector
      .ignore(this, () => {
        this.state.rows = rows
        this.state.isFilled = true
      })
      .catch(console.error)
  }
}