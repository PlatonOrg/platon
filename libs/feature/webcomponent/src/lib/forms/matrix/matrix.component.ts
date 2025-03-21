import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Injector,
  Input,
  Output,
  OnInit,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { MatrixComponentDefinition, MatrixState } from './matrix'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'

@Component({
  selector: 'wc-matrix',
  templateUrl: 'matrix.component.html',
  styleUrls: ['matrix.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(MatrixComponentDefinition)
export class MatrixComponent implements WebComponentHooks<MatrixState>, OnInit {
  @Input() state!: MatrixState
  @Output() stateChange = new EventEmitter<MatrixState>()

  @HostBinding('style')
  get styles() {
    return {
      '--cols': this.state.cols,
      '--rows': this.state.rows,
    }
  }

  constructor(readonly injector: Injector, readonly changeDetector: WebComponentChangeDetectorService) {}

  ngOnInit() {
    this.state.isFilled = false
  }

  onChangeState() {
    const { cols, rows } = this.state
    if (!this.state.cells) {
      this.state.cells = []
    }
    const length = this.state.cells.length
    const maxLength = cols * rows
    if (length < maxLength) {
      for (let i = length; i < maxLength; i++) {
        this.state.cells.push({ value: '0' })
      }
    } else if (length > maxLength) {
      this.state.cells = this.state.cells.slice(0, maxLength)
    }
  }

  resize(dimension: { cols: number; rows: number }) {
    this.state.cols = dimension.cols
    this.state.rows = dimension.rows
    this.changeDetector
      .ignore(this, () => {
        this.state.isFilled = true
      })
      .catch(console.error)
  }

  valueChange() {
    this.changeDetector
      .ignore(this, () => {
        this.state.isFilled = true
      })
      .catch(console.error)
  }

  trackBy(index: number) {
    return index
  }
}
