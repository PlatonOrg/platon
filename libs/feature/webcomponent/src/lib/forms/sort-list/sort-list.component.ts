import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output, OnInit } from '@angular/core'
import { WebComponent, WebComponentHooks } from '../../web-component'
import { SortListComponentDefinition, SortListItem, SortListState } from './sort-list'

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

  constructor(readonly injector: Injector) {}

  ngOnInit() {
    this.state.isFilled = false
  }

  onChangeState() {
    if (!Array.isArray(this.state.items)) {
      this.state.items = []
    }
    this.state.items.forEach((item, index) => {
      if (typeof item === 'string') {
        this.state.items[index] = {
          content: item,
        }
      }
    })
  }

  drop(event: CdkDragDrop<SortListItem[]>) {
    if (event.previousIndex !== event.currentIndex) {
      this.state.isFilled = true
    }
    moveItemInArray(this.state.items, event.previousIndex, event.currentIndex)
  }

  trackBy(index: number, item: SortListItem) {
    return item.content || index
  }

  getHorizontal() {
    return this.state?.alignment === 'left' ? 'text-align: left;' : ''
  }
}
