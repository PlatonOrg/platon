import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { WebComponentService } from '../../web-component.service'
import { WordSelectorComponentDefinition, WordSelectorItem, WordSelectorState } from './word-selector'
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { BaseModule } from '../../shared/components/base/base.module'
import { CommonModule } from '@angular/common'
import { NzCardModule } from 'ng-zorro-antd/card'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { NzGridModule } from 'ng-zorro-antd/grid'

interface InternalWordItem {
  id: number // help reduce delay when move the word
  content: string
  css: string
  isObject: boolean // false string, true string + css
}

@Component({
  selector: 'wc-word-selector',
  templateUrl: 'word-selector.component.html',
  styleUrls: ['word-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseModule,

    FormsModule,
    ReactiveFormsModule,

    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,

    DragDropModule,
    CommonModule,
    NzCardModule,

    NzTagModule,
    NzGridModule,
  ],
})
@WebComponent(WordSelectorComponentDefinition)
export class WordSelectorComponent implements WebComponentHooks<WordSelectorState>, OnInit {
  /**
   * The state of the word selector component.
   */
  @Input() state!: WordSelectorState

  private idCounter = 0
  localWords: InternalWordItem[] = []
  localSelectedWords: InternalWordItem[] = []

  constructor(readonly injector: Injector) {}

  /**
   * Initializes the component.
   */
  ngOnInit() {
    this.initLocalLists()
    this.shuffleArray()
    this.state.isFilled = false
    this.syncState()
  }

  private initLocalLists() {
    this.localWords = this.normalizeArray(this.state.words)
    this.localSelectedWords = this.normalizeArray(this.state.selectedWords)
  }

  private normalizeArray(array: (string | WordSelectorItem)[]): InternalWordItem[] {
    if (!array) return []
    return array.map((item) => {
      const isObj = typeof item !== 'string'
      return {
        id: this.idCounter++,
        content: isObj ? (item as WordSelectorItem).content : (item as string),
        css: isObj ? (item as WordSelectorItem).css || '' : '',
        isObject: isObj,
      }
    })
  }

  private syncState() {
    const mapToState = (word: InternalWordItem) => {
      if (word.isObject || word.css) {
        return { content: word.content, css: word.css }
      }
      return word.content
    }
    this.state.words = this.localWords.map(mapToState)
    this.state.selectedWords = this.localSelectedWords.map(mapToState)
  }

  drop(event: CdkDragDrop<InternalWordItem[]>) {
    if (event.previousContainer !== event.container || event.previousIndex !== event.currentIndex) {
      this.state.isFilled = true
    }
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex)
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex)
    }
    this.syncState()
  }

  addWord(word: InternalWordItem) {
    this.localSelectedWords.push(word)
    const index = this.localWords.findIndex((w) => w.id === word.id)
    if (index > -1) this.localWords.splice(index, 1)
    this.syncState()
  }

  removeWord(word: InternalWordItem) {
    this.localWords.push(word)
    const index = this.localSelectedWords.findIndex((w) => w.id === word.id)
    if (index > -1) this.localSelectedWords.splice(index, 1)
    this.syncState()
  }

  shuffleArray(): void {
    for (let i = this.localWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.localWords[i], this.localWords[j]] = [this.localWords[j], this.localWords[i]]
    }
    this.syncState()
  }
}
