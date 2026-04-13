import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnInit,
  Output,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentService } from '../../web-component.service'
import { CrosswordComponentDefinition, CrosswordState } from './crossword'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import CellActive from './model/cell-active'
import { CellActiveInterface } from './model/cell-active-interface'
import { Result } from './model/result'
import { CrossWordService } from './service/cross-word-service'

@Component({
  selector: 'wc-crossword',
  templateUrl: 'crossword.component.html',
  styleUrls: ['crossword.component.scss'],
  host: {
    '[style.display]': `state.appearance === 'inline' ? 'inline' : 'outline'`,
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(CrosswordComponentDefinition)
export class CrosswordComponent implements OnInit, WebComponentHooks<CrosswordState> {
  @Input() state!: CrosswordState
  @Output() stateChange = new EventEmitter<CrosswordState>()

  grid: string[][] = [[]]
  results: Result[] = []
  userAnswers: Result[] = []
  inProgress = false
  cellActive: CellActiveInterface = new CellActive(0, '', 0, 0)
  cellSize = 30
  cellSpace = this.cellSize + 10
  cellFont = this.cellSize / 1.5
  cellFontNumber = this.cellSize / 1.2
  marginTop = this.cellFontNumber * 2 + 10
  color = false

  private crossWordService: CrossWordService = inject(CrossWordService)

  private words: { clue: string; answer: string }[] = []

  private readonly webComponentService!: WebComponentService

  constructor(readonly injector: Injector, readonly changeDetector: WebComponentChangeDetectorService) {
    this.webComponentService = injector.get(WebComponentService)!
  }

  ngOnInit(): void {
    this.cellSpace = this.state.cellSize + 10
    this.cellFont = this.state.cellSize / 1.5
    this.cellFontNumber = this.cellSize / 1.2
    this.marginTop = this.cellFontNumber * 2 + 10

    this.state.words.forEach((element) => {
      this.words.push(element)
    })

    this.generateGrid()
    this.state.isFilled = false
  }

  generateGrid() {
    // remove the log of layout_generator.js who show answer
    const originConsoleLog = console.log
    console.log = () => {
      // please don't remove this otherwise, it's show all the words to write during the creation of the component
    }
    this.crossWordService.generateGridService(this.words)

    console.log = originConsoleLog // don't remove, it put the original console.log where it was

    const firstInit = this.state.grid.length == 0 // user can change results or grid but must not do it

    this.results = this.crossWordService.getResults()
    this.userAnswers = this.crossWordService.generateUserAnswers()
    this.grid = this.crossWordService.getGrid()
    if (firstInit) {
      this.userAnswers.forEach((res) => {
        this.state.results.push({ answer: res.answer, number: res.position })
      })
      this.state.grid = []
      for (let i = 0; i < this.grid.length; i++) {
        const array = []
        for (let j = 0; j < this.grid[0].length; j++) {
          if (this.grid[i][j] != '-') {
            array.push('') // Keep this othewise it's show answer
          } else {
            array.push('-')
          }
        }
        this.state.grid.push(array)
      }
    } else {
      // Copy this.state.results into this.userAnswers so that the update includes the previous values
      this.userAnswers.forEach((res) =>
        this.state.results.filter((el) => el.number == res.position).map((el) => (res.answer = el.answer))
      )
      this.color = true
    }
  }

  getCharAt(x: number, y: number): string {
    // read line by line
    if (y >= this.state.grid.length || x >= this.state.grid[y].length) {
      // Prevent errors
      return ' '
    }
    return this.state.grid[y][x]
  }

  getBackgroundColorClasses(x: number, y: number): string {
    if (this.color && this.state.correctionColor) {
      if (this.grid[y][x] == this.state.grid[y][x]) {
        return 'correctColor'
      }
      return 'wrongColor'
    }
    return 'defaultColor'
  }

  /* check if the cell is vertical word */
  /* used to place a number of clue's word */
  isStartCellVertical(x: number, y: number): boolean {
    if (this.crossWordService.isStartCellDownService(x, y)) {
      return true
    }
    return false
  }

  /* check if the cell is horizental word */
  /* used to place a number of clue's word */
  isStartCellHorizental(x: number, y: number): boolean {
    if (this.crossWordService.isStartCellAcrossService(x, y)) {
      return true
    }
    return false
  }

  /* methode de récuperation de position grace au startX et startY */
  resultByCoordonateXY(x: number, y: number): Result {
    return this.crossWordService.resultByCoordonateXYService(x, y)
  }

  /** focus the cursor to the next  cell by the coordonate x y */
  focusNextCell(x: number, y: number, dir: number) {
    let result
    let nextX = x
    let nextY = y
    const results = this.crossWordService.nextResultByXYFocusService(x, y)
    if (results.length > 1) {
      if (this.inProgress) {
        result = results.find((result) => result.orientation === this.cellActive.orientationWordActive)
      } else {
        /* prend la première position du tableau quoi se soit de l'orientation */
        result = results[0]
      }
    } else {
      result = results[0]
    }

    if (result) {
      const nextCoordonate = this.crossWordService.coordonateRedirectionByTabulationService(
        result.orientation,
        result.answer.length,
        x,
        y,
        dir
      )
      nextX = nextCoordonate.x
      nextY = nextCoordonate.y

      this.cellActive = new CellActive(result.answer.length, result.orientation, x, y)
      this.inProgress = nextCoordonate.status

      let nextCell = document.querySelector(`[data-x="${nextX}"][data-y="${nextY}"]`) as HTMLInputElement
      if (nextCell == null) {
        // security
        nextCell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`) as HTMLInputElement
      }
      nextCell.focus()
    }
  }

  updateValueUserAnswer(key: string, x: number, y: number) {
    this.state.grid[y][x] = key
    const resultFilter = this.userAnswers.filter(
      (result) =>
        (result.startx === x + 1 && result.orientation === 'down') ||
        (result.starty === y + 1 && result.orientation === 'across')
    )
    resultFilter.forEach((result) => {
      let gap = 0
      if (result.orientation === 'across') {
        gap = x + 1 - result.startx
      } else {
        gap = y + 1 - result.starty
      }
      const answer = result.answer.split('')
      answer[gap] = key
      result.answer = answer.join('')
      return result
    })
  }

  onKeyDown(event: KeyboardEvent, x: number, y: number) {
    const key = event.key
    const isLetter = /^[a-zA-Z0-9À-ÿ]$/.test(key)
    event.preventDefault() /* désactiver le comportement par défaut du navigateur */

    if (key === 'Backspace') {
      const input = event.target as HTMLInputElement
      if (this.getCharAt(x, y) != '') {
        input.value = ''
        this.updateValueUserAnswer('', x, y)
        return
      }
      const direction = this.crossWordService.directionTypeDelete(x, y)
      if (direction === 'H') {
        this.focusNextCell(x, y, 1)
      } else if (direction === 'V') {
        this.focusNextCell(x, y, 3)
      }
    } else if (isLetter) {
      this.color = false
      const input = event.target as HTMLInputElement
      input.value = key

      this.updateValueUserAnswer(key, x, y)
      this.focusNextCell(x, y, -1)
    } else if (key === 'Tab' || key === 'ArrowRight') {
      this.focusNextCell(x, y, 0)
    } else if (key === 'ArrowLeft') {
      this.focusNextCell(x, y, 1)
    } else if (key === 'ArrowDown') {
      this.focusNextCell(x, y, 2)
    } else if (key === 'ArrowUp') {
      this.focusNextCell(x, y, 3)
    }
    this.state.results = []
    this.userAnswers.forEach((res) => {
      this.state.results.push({ answer: res.answer, number: res.position })
    })
  }
}
