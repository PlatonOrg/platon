/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core'
import { ResourceLoaderService } from '@cisstech/nge/services'
import { firstValueFrom } from 'rxjs'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import { JsxComponentDefinition, type JsxState } from './jsx'
import { BaseModule } from '../../shared/components/base/base.module'

declare const JXG: any

@Component({
  selector: 'wc-jsx',
  templateUrl: 'jsx.component.html',
  styleUrls: ['jsx.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseModule],
})
@WebComponent(JsxComponentDefinition)
export class JsxComponent implements OnInit, OnDestroy, WebComponentHooks<JsxState> {
  readonly injector = inject(Injector)
  readonly resourceLoader = inject(ResourceLoaderService)
  readonly changeDetector = inject(WebComponentChangeDetectorService)

  private static NEXT_ID = 0
  private board?: any

  readonly boardId = 'jsx_graph' + ++JsxComponent.NEXT_ID

  @Input() state!: JsxState
  @Output() stateChange = new EventEmitter<JsxState>()

  async ngOnInit() {
    this.state.isFilled = false
    await firstValueFrom(
      this.resourceLoader.loadAllSync([
        ['script', 'assets/vendors/jsxgraph/jsxgraphcore.js'],
        ['style', 'assets/vendors/jsxgraph/jsxgraph.css'],
      ])
    )

    JXG.Options = JXG.merge(JXG.Options, {
      board: {
        showCopyright: false,
        keepAspectRatio: true,
      },
      elements: {
        highlight: false,
        showInfobox: false,
      },
      point: {
        showInfobox: false,
      },
    })
    // Created after a submission, the component restores the points moved by the learner.
    this.createBoard({ restorePoints: true })
  }

  ngOnDestroy() {
    this.destroyBoard()
  }

  onChangeState() {
    const changes = this.changeDetector.changes(this)
    if (!this.board) {
      return // ngOnInit is still loading JSXGraph: it will create the board from the current state.
    }

    if (changes.includes('script') || changes.includes('attributes')) {
      // A new script places the points itself: the saved positions, read from the previous board,
      // are only restored when the same change brings them too.
      this.createBoard({ restorePoints: changes.includes('points') })
    } else if (changes.includes('points')) {
      this.writePoints()
    }

    if (this.state.disabled) {
      this.board.removeEventHandlers()
    } else if (!this.board.hasPointerHandlers) {
      this.board.addEventHandlers()
    }
  }

  /**
   * Creates the board from the script of the state.
   * @param options.restorePoints Moves the movable points to their positions in the state, instead
   * of the positions of the script.
   */
  private createBoard(options: { restorePoints?: boolean } = {}) {
    this.destroyBoard()
    this.board = JXG.JSXGraph.initBoard(this.boardId, {
      axis: true,
      ...(this.state.attributes || {}),
    })

    const code = decodeURIComponent(this.state.script)
    const exec = new Function('board', code)
    exec(this.board)

    // When the component is recreated after a submission, the state holds the points moved by the
    // learner: they replace the initial positions of the script instead of being overwritten by them.
    if (options.restorePoints) {
      this.writePoints({ movableOnly: true })
    }
    this.readPoints()

    // Listened after the initialization, so that only the moves of the learner fill the component.
    this.board.on('update', () => {
      this.changeDetector.batch(this, () => {
        this.state.isFilled = true
        this.readPoints()
      })
    })
  }

  private destroyBoard() {
    if (this.board) {
      JXG.JSXGraph.freeBoard(this.board)
    }
  }

  private readPoints() {
    this.state.points = {}
    if (this.board.objectsList) {
      for (const o of this.board.objectsList) {
        if (JXG.isPoint(o) && o.name) {
          this.state.points[o.name] = {
            x: o.X(),
            y: o.Y(),
          }
        }
      }
    }
  }

  /**
   * Moves the named points of the board to their positions in the state.
   * @param options.movableOnly Only moves the points the learner can drag: the fixed and the
   * constructed points keep the position computed by the script.
   */
  private writePoints(options: { movableOnly?: boolean } = {}) {
    let updateNeeded = false
    const names = Object.keys(this.state.points || {})
    for (const name of names) {
      const object = this.board.objectsList.find((o: any) => {
        return JXG.isPoint(o) && o.name === name
      })
      const movable = object?.isDraggable && !object.visProp?.fixed
      if (object && (movable || !options.movableOnly)) {
        const point = this.state.points[name]
        const array = [point.x, point.y]
        object.setPosition(JXG.COORDS_BY_USER, array)
        updateNeeded = true
      }
    }

    if (updateNeeded) {
      this.board.fullUpdate()
    }
  }
}
