import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injector,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { BindedBubblesComponentDefinition, type BindedBubblesState, BubbleItem, PairBubbleItem } from './binded-bubbles'
import { WebComponentService } from '../../web-component.service'
import { BaseModule } from '../../shared/components/base/base.module'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { MatButtonModule } from '@angular/material/button'
import { NgeMarkdownModule } from '@cisstech/nge/markdown'

@Component({
  selector: 'wc-binded-bubbles',
  templateUrl: 'binded-bubbles.component.html',
  styleUrls: ['binded-bubbles.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [BaseModule, CssPipeModule, MatButtonModule, NgeMarkdownModule],
})
@WebComponent(BindedBubblesComponentDefinition)
export class BindedBubblesComponent implements WebComponentHooks<BindedBubblesState>, OnInit, AfterViewInit, OnDestroy {
  readonly injector = inject(Injector)
  private cd = inject(ChangeDetectorRef)

  @Input() state!: BindedBubblesState
  @Output() stateChange = new EventEmitter<BindedBubblesState>()

  webComponentService: WebComponentService

  numberPairToShow = 3
  shuffledList: BubbleItem[] = []
  list1: BubbleItem[] = []
  list2: BubbleItem[] = []
  waitingChoice: { index1: number; index2: number; pair: PairBubbleItem }[] = []
  clickedList: (BubbleItem | undefined)[] = [undefined, undefined]
  achieveList: PairBubbleItem[] = []
  timeoutID: NodeJS.Timeout | undefined
  private refillTimeouts: NodeJS.Timeout[] = []

  constructor() {
    const injector = this.injector

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.webComponentService = injector.get(WebComponentService)!
  }

  ngOnInit() {
    let cmp = 0
    this.numberPairToShow = this.state.numberPairToShow
    // After a submission, the component is created again with the submitted state:
    // the pairs already found stay found, the other bubbles are reset.
    this.state.items.forEach((element) => {
      const found = this.isFound(element)
      element.item1.id = cmp++ + ''
      element.item1.state = found ? 'achieved' : 'unchecked'
      element.item2.id = cmp++ + ''
      element.item2.state = found ? 'achieved' : 'unchecked'
      if (found) this.achieveList.push(element)
    })
    this.state.isFilled = false
    this.constructShuffleList()
  }

  ngOnDestroy() {
    clearTimeout(this.timeoutID)
    this.refillTimeouts.forEach((id) => clearTimeout(id))
  }

  onChangeState(): void {
    if (!Array.isArray(this.state.items)) {
      this.state.items = []
    }
    if (this.state.numberPairToShow != this.numberPairToShow) {
      this.numberPairToShow = this.state.numberPairToShow
      this.shuffledList = []
      this.list1 = []
      this.list2 = []
      this.waitingChoice = []
      this.clickedList = []
      this.constructShuffleList()
    }
  }

  updateClickedList(item: BubbleItem, fromList: 'list1' | 'list2') {
    if (item.state === 'unchecked') {
      item.state = 'checked'
      const index = fromList === 'list1' ? 0 : 1
      if (this.clickedList[index] !== undefined) {
        this.clickedList[index].state = 'unchecked'
        this.clickedList[index] = undefined
      }
      this.clickedList[index] = item
    } else if (item.state === 'checked') {
      item.state = 'unchecked'
      this.clickedList = this.clickedList.filter((element) => element?.id !== item.id)
    }
    if (this.clickedList.length > 2) {
      const item = this.clickedList.shift()
      if (item !== undefined) {
        item.state = 'unchecked'
      }
    }
    this.achievePair()
  }

  achievePair() {
    if (this.clickedList.length === 2) {
      if (this.clickedList[0] === undefined || this.clickedList[1] === undefined) {
        return
      }
      const pair = this.generatePair(this.clickedList[0], this.clickedList[1])

      let foundPair: PairBubbleItem | undefined = undefined
      let sameSide = true
      for (const item of this.state.items) {
        if (item.item1.id === pair.item1.id) {
          sameSide = !sameSide
        }
        if (item.item1.id === pair.item1.id && item.item2.id === pair.item2.id) {
          foundPair = item
          break
        }
      }

      if (foundPair) {
        this.clearClickedList(false)
        this.handleAchievedPair(foundPair)
        this.autoValidate()
      } else {
        if (!sameSide) {
          this.state.nbError++
          this.state.errors.push(pair)
          this.clearClickedList(true)
        } else {
          const item = this.clickedList.shift()
          if (item !== undefined) {
            item.state = 'unchecked'
          }
        }
      }
      //mettre à jour les deux list
      // this.list1 = this.list1.slice()
      // this.list2 = this.list2.slice()
    }
  }

  private generatePair(item1: BubbleItem, item2: BubbleItem): PairBubbleItem {
    return {
      item1: { ...item1 },
      item2: { ...item2 },
    }
  }

  private handleAchievedPair(pair: PairBubbleItem) {
    this.achieveList.push(pair)
    this.state.items.forEach((item) => {
      if (item.item1.id === pair.item1.id && item.item2.id === pair.item2.id) {
        item.item1.state = 'achieved'
        item.item2.state = 'achieved'
      }
    })

    if (this.state.mode === 'shuffle') {
      this.handleShuffleAchievedPair(pair)
    } else {
      this.handleOrderedAchievedPair(pair)
    }
  }

  private handleOrderedAchievedPair(pair: PairBubbleItem) {
    const index1 = this.list1.findIndex((item) => item.id === pair.item1.id)
    const index2 = this.list2.findIndex((item) => item.id === pair.item2.id)
    this.list1[index1].state = 'achieved'
    this.list2[index2].state = 'achieved'
    const concatList = this.list1.concat(this.list2)
    let randomItem: PairBubbleItem | undefined
    do {
      randomItem = this.getRandomPairThatIsNotInTheList(concatList)
      //while randomItem is in waitingChoice
    } while (this.waitingChoice.find((elem) => elem.pair.item1.id === randomItem?.item1.id) !== undefined)

    if (randomItem == undefined) {
      this.list1[index1].state = 'disabled'
      this.list2[index2].state = 'disabled'
      return
    }

    this.waitingChoice.push({ index1: index1, index2: index2, pair: randomItem })

    if (this.waitingChoice.length >= 2) {
      clearTimeout(this.timeoutID)
      this.fillOrdered()
      this.timeoutID = undefined
    } else {
      this.timeoutID = setTimeout(() => {
        this.timeoutID = undefined
        this.fillOrdered()
      }, this.state.timeout) // If you reach this timeout, place a good pair at the same index
    }
  }

  getRandomPairThatIsNotInTheList(list: BubbleItem[]): PairBubbleItem | undefined {
    let count = 0
    this.state.items.forEach((element) => {
      if (element.item1.state !== 'achieved' && element.item2.state !== 'achieved') {
        count++
      }
    })
    if (count < this.numberPairToShow) {
      return undefined
    }
    let randomIndex = Math.floor(Math.random() * this.state.items.length)
    let randomPair = this.state.items[randomIndex]
    while (this.foundPair(list, randomPair)) {
      randomIndex = Math.floor(Math.random() * this.state.items.length)
      randomPair = this.state.items[randomIndex]
    }
    return randomPair
  }

  /**
   * Shuffle mode: once the timeout is over, the slots of the found pair are refilled with an item1
   * and an item2 drawn independently, so the two new bubbles do not necessarily form a pair.
   */
  private handleShuffleAchievedPair(pair: PairBubbleItem) {
    const index1 = this.list1.findIndex((item) => item.id === pair.item1.id)
    const index2 = this.list2.findIndex((item) => item.id === pair.item2.id)
    // Each pending refill will take one of the hidden bubbles: when none is left for this pair,
    // its bubbles are greyed out at once, as in ordered mode, to show that the game is ending.
    if (this.hiddenItems().hidden1.length <= this.refillTimeouts.length) {
      this.list1[index1] = { ...this.list1[index1], state: 'disabled' }
      this.list2[index2] = { ...this.list2[index2], state: 'disabled' }
      return
    }
    const timeoutID = setTimeout(() => {
      this.refillTimeouts = this.refillTimeouts.filter((id) => id !== timeoutID)
      this.fillShuffled(index1, index2)
      this.cd.markForCheck()
    }, this.state.timeout)
    this.refillTimeouts.push(timeoutID)
  }

  /** Pairs not found yet, and their bubbles that are not displayed. */
  private hiddenItems() {
    const displayed = new Set([...this.list1, ...this.list2].map((item) => item.id))
    const remaining = this.state.items.filter((pair) => !this.isFound(pair))
    return {
      remaining,
      hidden1: remaining.map((pair) => pair.item1).filter((item) => !displayed.has(item.id)),
      hidden2: remaining.map((pair) => pair.item2).filter((item) => !displayed.has(item.id)),
    }
  }

  private fillShuffled(index1: number, index2: number) {
    const { remaining, hidden1, hidden2 } = this.hiddenItems()
    // As many item1 as item2 remain hidden (checked before the timeout).
    if (!hidden1.length || !hidden2.length) return

    this.list1[index1] = this.pickRandom(hidden1)
    let next2 = this.pickRandom(hidden2)

    // The learner must always be able to form a pair: if the drawn bubbles leave no pair on the
    // screen, the new item2 is replaced by the partner of a displayed item1 (which is hidden then).
    const partnerOf = (item: BubbleItem) => remaining.find((pair) => pair.item1.id === item.id)?.item2
    const playable = (item: BubbleItem) => item.state !== 'achieved' && item.state !== 'disabled'
    const shown1 = this.list1.filter(playable)
    const shown2 = new Set(this.list2.filter(playable).map((item) => item.id)).add(next2.id)
    if (!shown1.some((item) => shown2.has(partnerOf(item)?.id ?? ''))) {
      next2 = partnerOf(this.pickRandom(shown1)) ?? next2
    }
    this.list2[index2] = next2
  }

  private pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  /** A found pair is `achieved`, or `disabled` for the last pairs in ordered mode. */
  private isFound(pair: PairBubbleItem): boolean {
    return pair.item1.state === 'achieved' || pair.item1.state === 'disabled'
  }

  constructShuffleList() {
    const remaining = this.state.items.filter((pair) => !this.isFound(pair))
    // Once every pair is found, the last pairs stay displayed, greyed out, as at the end of a game.
    const cuttedList = remaining.length
      ? remaining.slice(0, this.numberPairToShow)
      : this.state.items.slice(-this.numberPairToShow).map((pair) => ({
          item1: { ...pair.item1, state: 'disabled' as const },
          item2: { ...pair.item2, state: 'disabled' as const },
        }))
    cuttedList.forEach((element) => {
      this.shuffledList.push(element.item1)
      this.shuffledList.push(element.item2)
    })
    this.shuffleByMode()
  }

  shuffleByMode() {
    // Both modes display the item1 in a column and the item2 in the other one.
    this.splitListAndShuffle(this.shuffledList)
  }

  shuffle(array: BubbleItem[]): BubbleItem[] {
    //shuffle an array
    let currentIndex = array.length,
      randomIndex
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex--
      ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }
    return array
  }

  splitListAndShuffle(array: BubbleItem[]): void {
    this.list1 = array.filter((_, index) => index % 2 === 0)
    this.list2 = array.filter((_, index) => index % 2 !== 0)
    this.list1 = this.shuffle(this.list1)
    this.list2 = this.shuffle(this.list2)
  }

  foundPair(tab: BubbleItem[], pair: PairBubbleItem): BubbleItem | undefined {
    if (pair.item1.state === 'achieved' || pair.item2.state === 'achieved') return pair.item1
    return tab.find((element) => element.id === pair.item1.id || element.id === pair.item2.id)
  }

  onAnimationEnd(item: BubbleItem) {
    if (item.state === 'error') {
      item.state = 'unchecked'
    }
  }

  clearClickedList(gotWrong: boolean) {
    if (gotWrong)
      this.clickedList.forEach((element) => {
        if (element) element.state = 'error'
      })
    else
      this.clickedList.forEach((element) => {
        if (element) element.state = 'achieved'
      })
    this.clickedList = []
  }

  shuffleChoice() {
    const copiedWaitingChoice = JSON.parse(JSON.stringify(this.waitingChoice)) as {
      index1: number
      index2: number
      pair: PairBubbleItem
    }[]
    let listOfItem2 = copiedWaitingChoice.map((elem) => elem.pair.item2)
    listOfItem2 = this.shuffle(listOfItem2)
    copiedWaitingChoice.forEach((elem, index) => {
      elem.pair.item2 = listOfItem2[index]
    })
    this.waitingChoice = copiedWaitingChoice
  }

  fillOrdered(): void {
    this.shuffleChoice()
    const length = this.waitingChoice.length
    for (let i = 0; i < length; i++) {
      const pairToAdd = this.waitingChoice.pop()!
      this.list1[pairToAdd.index1] = pairToAdd.pair.item1
      this.list2[pairToAdd.index2] = pairToAdd.pair.item2
    }
  }

  protected autoValidate() {
    if (this.achieveList.length === this.state.items.length) {
      this.webComponentService.submit(this)
    }
  }

  protected trackById(index: number, item: BubbleItem): string {
    return item.id
  }

  // scroll indicator
  @ViewChildren('scrollableDiv') scrollableSpans!: QueryList<ElementRef>
  needsHorizontalScroll: Map<any, boolean> = new Map()

  ngAfterViewInit() {
    this.scrollableSpans.changes.subscribe(() => {
      this.checkAllHorizontalOverflows()
    })

    this.checkAllHorizontalOverflows()
  }

  @HostListener('window:resize', ['$event'])
  onResize(_event: Event) {
    this.checkAllHorizontalOverflows()
  }

  /** check if we need the scrollbar indicator or not for each item */
  checkAllHorizontalOverflows(): void {
    this.needsHorizontalScroll.clear()
    if (!this.scrollableSpans || this.scrollableSpans.length === 0) {
      return
    }
    this.scrollableSpans.forEach((elementRef: ElementRef) => {
      const spanElement = elementRef.nativeElement as HTMLElement
      const availableContainer = spanElement.parentNode as HTMLElement
      if (!availableContainer) {
        return
      }
      const itemId = spanElement.getAttribute('data-item-id')
      if (!itemId) {
        console.error("Erreur: ID de l'item manquant sur l'élément span.")
        return
      }
      const isOverflowing = spanElement.scrollWidth > availableContainer.clientWidth
      this.needsHorizontalScroll.set(itemId, isOverflowing)
    })
    this.cd.detectChanges()
  }
}
