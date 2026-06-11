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

  // give the number for starting cell, list because can go down or across
  getResultsAtCoordinates(x: number, y: number): any[] {
    return this.results.filter((word) => word.startx === x + 1 && word.starty === y + 1)
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
          if (this.grid[i][j] != this.crossWordService.getemptyCellSymbol()) {
            array.push('') // Keep this othewise it's show answer
          } else {
            array.push(this.crossWordService.getemptyCellSymbol())
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
      // Unicode-safe
      const answerChars = [...result.answer]
      answerChars[gap] = key
      result.answer = answerChars.join('')
    })
  }

  // for user input
  onInput(event: Event, x: number, y: number): void {
    const inputEvent = event as InputEvent
    if (inputEvent.isComposing) {
      return // allow to enter thing like Ctrl + Maj + u + 3042
    }
    const input = event.target as HTMLInputElement
    const value = input.value
    if (!value) {
      this.updateValueUserAnswer('', x, y)
      return
    }
    const chars = [...value]
    const lastChar = chars[chars.length - 1]
    const isAlphaNumeric = /^[\p{L}\p{N}]$/u.test(lastChar)
    if (!isAlphaNumeric) {
      input.value = ''
      this.updateValueUserAnswer('', x, y)
      return
    }
    input.value = lastChar
    this.color = false
    this.updateValueUserAnswer(lastChar, x, y)
    this.focusNextCell(x, y, -1)
    this.syncStateWithAnswers()
  }
  // for the navigation
  onKeyDown(event: KeyboardEvent, x: number, y: number) {
    const key = event.key
    if (key === 'Backspace') {
      if (this.getCharAt(x, y) !== '') {
        // eslint-disable-next-line prettier/prettier
        (event.target as HTMLInputElement).value = '' // disable prettier was asking for a ; at the start of the line
        this.updateValueUserAnswer('', x, y)
        return
      }
      const direction = this.crossWordService.directionTypeDelete(x, y)
      this.focusNextCell(x, y, direction === 'H' ? 1 : 3)
      event.preventDefault()
    } else if (key === 'ArrowRight' || key === 'Tab') {
      this.focusNextCell(x, y, 0)
      event.preventDefault()
    } else if (key === 'ArrowLeft') {
      this.focusNextCell(x, y, 1)
      event.preventDefault()
    } else if (key === 'ArrowDown') {
      this.focusNextCell(x, y, 2)
      event.preventDefault()
    } else if (key === 'ArrowUp') {
      this.focusNextCell(x, y, 3)
      event.preventDefault()
    }
  }

  // update the student answer
  private syncStateWithAnswers() {
    this.state.results = this.userAnswers.map((res) => ({
      answer: res.answer,
      number: res.position,
    }))
  }
}
