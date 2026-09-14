import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core'

import { NzEmptyModule } from 'ng-zorro-antd/empty'

import { NgeUiListModule } from '@cisstech/nge/ui/list'
import { Resource } from '@platon/feature/resource/common'
import { ExerciseCardComponent } from '../exercise-card/exercise-card.component'
import { DragDropModule } from '@angular/cdk/drag-drop'

@Component({
  selector: 'app-exercise-list',
  templateUrl: './exercise-list.component.html',
  styleUrls: ['./exercise-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzEmptyModule, NgeUiListModule, ExerciseCardComponent, DragDropModule],
})
export class ExerciseListComponent {
  @Input() items: Resource[] = []

  @Output() levelClicked = new EventEmitter<string>()
  @Output() topicClicked = new EventEmitter<string>()
  @Output() exerciseClicked = new EventEmitter<Resource>()

  private resizeObserver?: ResizeObserver
  private readonly CARD_MIN = 311
  private readonly GAP = 16

  @ViewChild('grid',{read: ElementRef}) set gridRef(grid: ElementRef<HTMLElement> | undefined){
    if (!grid){
      return
    }
      this.resizeObserver = new ResizeObserver(entries => {
        const width = entries[0].contentRect.width
        const cols = Math.max(1,Math.floor((width + this.GAP) / (this.CARD_MIN + this.GAP)))
        grid.nativeElement.style.setProperty('--cols', String(cols))
      })
      this.resizeObserver.observe(grid.nativeElement)
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
  }

}
