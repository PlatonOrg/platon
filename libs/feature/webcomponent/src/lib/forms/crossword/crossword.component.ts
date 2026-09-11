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
import { CrosswordComponentDefinition, type CrosswordState } from './crossword'
import { WebComponentChangeDetectorService } from '../../web-component-change-detector.service'
import CellActive from './model/cell-active'
import { CellActiveInterface } from './model/cell-active-interface'
import { Result } from './model/result'
import { CrossWordService } from './service/cross-word-service'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { BaseModule } from '../../shared/components/base/base.module'
import { MatIconModule } from '@angular/material/icon'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { CssPipeModule } from '../../shared/pipes/css.pipe'

@Component({
  selector: 'wc-crossword',
  templateUrl: 'crossword.component.html',
  styleUrls: ['crossword.component.scss'],
  host: {
    '[style.display]': `state.appearance === 'inline' ? 'inline' : 'outline'`,
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseModule,

    FormsModule,
    ReactiveFormsModule,

    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatIconModule,

    CssPipeModule,

    NzPopoverModule,
  ],
})
@WebComponent(CrosswordComponentDefinition)
export class CrosswordComponent implements OnInit, WebComponentHooks<CrosswordState> {
  readonly injector = inject(Injector)
  readonly changeDetector = inject(WebComponentChangeDetectorService)

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

  constructor() {
    const injector = this.injector

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
    const currentResults = this.crossWordService.nextResultByXYFocusService(x, y)
    let orientationToUse = ''

    if (dir === -1) {
      // writing
      if (currentResults.length > 1) {
        if (this.inProgress) {
          orientationToUse = this.cellActive.orientationWordActive // intersection keep orientation
        } else {
          return // start on intersection
        }
      } else if (currentResults.length === 1) {
        orientationToUse = currentResults[0].orientation // no intersection
      } else {
        return
      }
    } else {
      // navigation with arrow
      if (dir === 0 || dir === 1) orientationToUse = 'across'
      if (dir === 2 || dir === 3) orientationToUse = 'down'
    }
    const nextCoordonate = this.crossWordService.coordonateRedirectionByTabulationService(orientationToUse, x, y, dir)
    if (nextCoordonate.status) {
      const nextX = nextCoordonate.x
      const nextY = nextCoordonate.y
      const nextResults = this.crossWordService.nextResultByXYFocusService(nextX, nextY)
      let nextOrientation = orientationToUse
      if (nextResults.length === 1) {
        nextOrientation = nextResults[0].orientation
        this.inProgress = true
      } else if (nextResults.length > 1) {
        // intersection
        const hasSameOrientation = nextResults.some((r) => r.orientation === orientationToUse)
        nextOrientation = hasSameOrientation ? orientationToUse : nextResults[0].orientation
        this.inProgress = true
      } else {
        this.inProgress = false
      }
      const activeWord = nextResults.find((r) => r.orientation === nextOrientation) || nextResults[0]
      const wordLength = activeWord ? activeWord.answer.length : 0
      this.cellActive = new CellActive(wordLength, nextOrientation, nextX, nextY)
      // html focus
      const nextCell = document.querySelector(`[data-x="${nextX}"][data-y="${nextY}"]`) as HTMLInputElement
      if (nextCell) {
        nextCell.focus()
      }
    }
  }

  updateValueUserAnswer(key: string, x: number, y: number) {
    this.state.grid[y][x] = key
    const resultFilter = this.userAnswers.filter((result) => {
      const originalWord = this.results.find((r) => r.position === result.position)
      const wordLength = originalWord ? originalWord.answer.length : result.answer.length
      if (result.orientation === 'across') {
        return result.starty === y + 1 && x + 1 >= result.startx && x + 1 < result.startx + wordLength
      } else if (result.orientation === 'down') {
        return result.startx === x + 1 && y + 1 >= result.starty && y + 1 < result.starty + wordLength
      }
      return false
    })
    resultFilter.forEach((result) => {
      let gap = 0
      if (result.orientation === 'across') {
        gap = x + 1 - result.startx
      } else {
        gap = y + 1 - result.starty
      }
      const originalWord = this.results.find((r) => r.position === result.position)
      const wordLength = originalWord ? originalWord.answer.length : result.answer.length
      const answerChars = result.answer ? [...result.answer] : []
      while (answerChars.length < wordLength) {
        answerChars.push('-')
      }
      answerChars[gap] = key === '' ? '-' : key
      result.answer = answerChars.slice(0, wordLength).join('')
    })
    this.syncStateWithAnswers()
  }

  // for user input
  onInput(event: Event, x: number, y: number): void {
    this.color = false
    const inputEvent = event as InputEvent
    if (inputEvent.isComposing) {
      return // allow to enter thing like Ctrl + Maj + u + 3042
    }
    const input = event.target as HTMLInputElement
    let value = input.value
    const oldChar = this.getCharAt(x, y)
    if (value.length > 1 && oldChar && oldChar !== ' ') {
      value = value.replace(oldChar, '')
    }
    if (!value) {
      this.updateValueUserAnswer('', x, y)
      return
    }
    const chars = [...value]
    const lastChar = chars[chars.length - 1]
    const isAlphaNumeric = /^[\p{L}\p{N}]$/u.test(lastChar)
    if (!isAlphaNumeric) {
      input.value = oldChar && oldChar !== ' ' ? oldChar : ''
      this.updateValueUserAnswer(input.value, x, y)
      return
    }
    input.value = lastChar
    this.updateValueUserAnswer(lastChar, x, y)
    this.focusNextCell(x, y, -1)
  }

  // use to override the content of a cell
  onFocus(event: FocusEvent, x: number, y: number): void {
    const input = event.target as HTMLInputElement
    setTimeout(() => {
      const len = input.value.length
      input.setSelectionRange(len, len)
    }, 0)
    const currentResults = this.crossWordService.nextResultByXYFocusService(x, y)
    if (currentResults.length === 1) {
      this.cellActive = new CellActive(currentResults[0].answer.length, currentResults[0].orientation, x, y)
      this.inProgress = true
    } else if (currentResults.length > 1) {
      // intersection try to keep the direction
      const hasSameOrientation = currentResults.some((r) => r.orientation === this.cellActive.orientationWordActive)
      const orientation = hasSameOrientation ? this.cellActive.orientationWordActive : currentResults[0].orientation
      const activeWord = currentResults.find((r) => r.orientation === orientation) || currentResults[0]
      this.cellActive = new CellActive(activeWord.answer.length, orientation, x, y)
      this.inProgress = true
    }
  }

  // for the navigation
  onKeyDown(event: KeyboardEvent, x: number, y: number) {
    const key = event.key
    this.color = false
    if (key === 'Backspace') {
      if (this.getCharAt(x, y) !== '') {
        ;(event.target as HTMLInputElement).value = '' // prettier ask for ; at the start of the line, then ask to remove it
        this.updateValueUserAnswer('', x, y)
        return
      }
      const currentOrientation = this.cellActive.orientationWordActive
      const deleteDir = currentOrientation === 'across' ? 1 : 3 // 1 = left, 3 = top
      this.focusNextCell(x, y, deleteDir)
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
