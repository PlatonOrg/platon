import { Injectable } from '@angular/core'

import * as clg from 'crossword-layout-generator'
import { Result } from '../model/result'
import { Coordonate } from '../model/coordonate'
import { NextCoordonate } from '../model/next-coordonate'

@Injectable({
  providedIn: 'root',
})
export class CrossWordService {
  private grid: string[][] = []
  private results: Result[] = []
  private userAnswers: Result[] = []
  private userGrid: string[][] = []
  private lastPosition = [-1, -1]
  lastStatusPos = 'U' // 'U' unknown, user must choose by himself (crossing or end of a word), 'V' vertical, 'H' horizontal

  generateGridService(words: { clue: string; answer: string }[]) {
    const layout = clg.generateLayout(words)
    this.grid = layout.table
    this.results = layout.result
    this.results = layout.result.filter((word: Result) => word.orientation != 'none')
    this.userAnswers = this.generateUserAnswers()
    this.lastPosition = [-1, -1]
  }

  directionTypeDelete(x: number, y: number): string {
    const vertical = y - 1 >= 0 && this.grid[y - 1][x] != '-'
    const horizontal = x - 1 >= 0 && this.grid[y][x - 1] != '-'

    const isAdjacentY = y + 1 == this.lastPosition[1] && x == this.lastPosition[0]
    const isAdjacentX = x + 1 == this.lastPosition[0] && y == this.lastPosition[1]

    this.lastStatusPos = this.getInformationDirection(vertical, horizontal, isAdjacentY, isAdjacentX)
    this.lastPosition = [x, y]
    return this.lastStatusPos
  }

  getInformationDirection(vertical: boolean, horizontal: boolean, isAdjacentY: boolean, isAdjacentX: boolean): string {
    if (horizontal == vertical && horizontal) {
      // crossing

      if (isAdjacentX || isAdjacentY) {
        // keep the same direction
        return this.lastStatusPos
      }
      return 'U' // click on a random crossing
    }
    if (horizontal == vertical) {
      // both are false
      return 'U' // end of the word
    }

    // can't go from "H" to "V" and inverlsy must pass by "U"
    if (horizontal && (this.lastStatusPos == 'U' || this.lastStatusPos == 'H' || !(isAdjacentX || isAdjacentY))) {
      this.lastStatusPos = 'H' // keep on horizontal
    } else if (vertical && (this.lastStatusPos == 'U' || this.lastStatusPos == 'V' || !(isAdjacentX || isAdjacentY))) {
      this.lastStatusPos = 'V' // keep on vertical
    } else {
      this.lastStatusPos = 'U'
    }
    return this.lastStatusPos
  }

  /* give the direction of the next cell
     if two direction is possible it return "U" same if we click on a case that is not aside the last one
     return 'H', 'U' or 'V'
  */
  directionType(x: number, y: number): string {
    const vertical = y + 1 < this.grid.length && this.grid[y + 1][x] != '-'
    const horizontal = x + 1 < this.grid[0].length && this.grid[y][x + 1] != '-'

    const isAdjacentY = y - 1 == this.lastPosition[1] && x == this.lastPosition[0]
    const isAdjacentX = x - 1 == this.lastPosition[0] && y == this.lastPosition[1]

    this.lastStatusPos = this.getInformationDirection(vertical, horizontal, isAdjacentY, isAdjacentX)
    this.lastPosition = [x, y]
    return this.lastStatusPos
  }

  generateUserGridServie() {
    for (let i = 0; i < this.grid[0].length; i++) {
      const array = []
      for (let j = 0; j < this.grid[0].length; j++) {
        array.push('')
      }
      this.userGrid.push(array)
    }
  }

  /* generate user answers */
  generateUserAnswers() {
    const resultsCopy = this.results
    const userAnswers = resultsCopy.map((result) => ({
      ...result,
      answer: '-'.repeat(result.answer.length),
    }))
    return userAnswers
  }

  /* getter of retrieve grid */
  getGrid(): string[][] {
    const grid = this.grid
    return grid
  }

  /* getter of retrieve result */
  getResults(): Result[] {
    const result = this.results
    return result
  }

  /* check if the cell is the start of a word */
  private isStartCell(x: number, y: number, result: Result): boolean {
    return result.startx === x + 1 && result.starty === y + 1
  }

  /* check if the cell is a vertical word */
  isStartCellDownService(x: number, y: number): boolean {
    return this.results.some((result) => result.orientation === 'down' && this.isStartCell(x, y, result))
  }

  /* check if the cell is a horizental word */
  isStartCellAcrossService(x: number, y: number): boolean {
    return this.results.some((result) => result.orientation === 'across' && this.isStartCell(x, y, result))
  }

  resultByCoordonateXYService(x: number, y: number): Result {
    const result = this.results.find((result) => this.isStartCell(x, y, result))
    if (!result) {
      return { clue: '', answer: '', startx: 0, starty: 0, orientation: '', position: 0 }
    } else {
      return result
    }
  }

  /*lambda for nextResultByXYFocusService*/
  lambda(result: Result, x: number, y: number): boolean {
    if (result.orientation == 'across') {
      return result.starty === y + 1 && x + 1 >= result.startx && x + 1 < result.startx + result.answer.length
    } else {
      return result.startx === x + 1 && y + 1 >= result.starty && y + 1 < result.starty + result.answer.length
    }
  }

  /* method to retrieve the next by result of x  and y */
  nextResultByXYFocusService(x: number, y: number): Result[] {
    return this.results.filter((result) => this.lambda(result, x, y))
  }

  coordonateRedirectionByTabulationService(
    orientation: string,
    size: number,
    x: number,
    y: number,
    dir: number
  ): Coordonate {
    let nextX = x
    let nextY = y
    let status = true
    const direction = this.directionType(x, y)
    switch (dir) {
      case -1:
        if (direction == 'V') {
          nextY++
          size - nextY <= 1 ? (status = false) : (status = true)
        } else if (direction == 'H') {
          nextX++
          size - nextX <= 1 ? (status = false) : (status = true)
        }
        return new NextCoordonate(nextX, nextY, status)
      case 0: // right
        nextX++
        size - nextX <= 1 ? (status = false) : (status = true)
        return new NextCoordonate(nextX, nextY, status)
      case 2: // down
        nextY++
        size - nextY <= 1 ? (status = false) : (status = true)
        return new NextCoordonate(nextX, nextY, status)
      case 3: // up
        nextY--
        nextY < 1 ? (status = false) : (status = true)
        return new NextCoordonate(nextX, nextY, status)
      case 1: // left
        nextX--
        nextX < 1 ? (status = false) : (status = true)
        return new NextCoordonate(nextX, nextY, status)
      default:
        break
    }
    return new NextCoordonate(nextX, nextY, status)
  }
}
