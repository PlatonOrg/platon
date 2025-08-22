import { CdkDragDrop } from '@angular/cdk/drag-drop'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  Output,
} from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { SortListComponentDefinition, SortListItem, SortListState } from './sort-list'
import { v4 as uuidv4 } from 'uuid'
import { deepCopy } from '@cisstech/nge/utils'

@Component({
  selector: 'wc-sort-list',
  templateUrl: 'sort-list.component.html',
  styleUrls: ['sort-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
@WebComponent(SortListComponentDefinition)
export class SortListComponent implements WebComponentHooks<SortListState>, OnInit {
  @Input() state!: SortListState
  @Output() stateChange = new EventEmitter<SortListState>()

  constructor(readonly injector: Injector, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.state.isFilled = false
    this.state.items = this.state.items.map((item) => {
      if (typeof item === 'string') {
        return { id: this.generateUniqueId(), content: item }
      }
      return item
    })
  }

  generateUniqueId(): string {
    return `item-${uuidv4()}`
  }

  trackBy(index: number, item: SortListItem): string {
    return item.id
  }

  drop(event: CdkDragDrop<SortListItem[]>): void {
    if (event.previousIndex === event.currentIndex) return

    try {
      const plainItems = deepCopy(this.state.items)

      const [itemToMove] = plainItems.splice(event.previousIndex, 1)
      plainItems.splice(event.currentIndex, 0, itemToMove)

      this.state.items = plainItems
    } finally {
      this.state.isFilled = true
      this.cdr.markForCheck()
      if (this.stateChange) {
        this.stateChange.emit(this.state)
      }
    }
  }

  getHorizontal() {
    return this.state?.alignment === 'left' ? 'text-align: left;' : ''
  }
}
