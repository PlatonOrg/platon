import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal, computed, inject, Input } from '@angular/core'
import { Editor, FileService, NotificationService, OpenRequest } from '@cisstech/nge-ide/core'
import { PleInput } from '@platon/feature/compiler'
import { Subscription } from 'rxjs'
import { ActivatedRoute } from '@angular/router'
import { InputFileService } from '@platon/feature/resource/browser'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { MatIconModule } from '@angular/material/icon'
import { NzListModule } from 'ng-zorro-antd/list'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzSwitchModule } from 'ng-zorro-antd/switch'
import { PleInputEditorModule } from '../ple-input/ple-input.module'

@Component({
  selector: 'app-plc-editor',
  templateUrl: './plc-editor.component.html',
  styleUrls: ['./plc-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatIconModule,
    NzListModule,
    NzButtonModule,
    NzIconModule,
    NzToolTipModule,
    NzSwitchModule,
    PleInputEditorModule,
  ],
})
export class PlcEditorComponent implements OnInit, OnDestroy {
  private readonly fileService = inject(FileService)
  private readonly notificationService = inject(NotificationService)

  private readonly inputFileService = inject(InputFileService)

  private readonly subscriptions: Subscription[] = []
  private request!: OpenRequest
  protected debug = false

  @Input()
  protected editor!: Editor

  protected readOnly = signal<boolean>(false)
  protected inputs = signal<PleInput[]>([])
  protected selectionIndex = signal<number>(-1)

  protected selection = computed(() => {
    const index = this.selectionIndex()
    const list = this.inputs()
    return index >= 0 && index < list.length ? list[index] : undefined
  })

  resourceId = this.route.snapshot.paramMap.get('id')
  version = this.route.snapshot.queryParamMap.get('version')
  constructor(private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.editor.onChangeRequest.subscribe((request) => {
        this.request = request
        this.createEditor().catch(console.error)
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected addInput(): void {
    const input: PleInput = {
      name: `variable${this.inputs().length + 1}`,
      description: '',
      type: 'text',
      value: '',
      options: {},
    }

    this.inputs.update((current) => [...current, input as PleInput])
    this.selectInput(this.inputs().length - 1)
    this.onChangeInput()
  }

  protected deleteInput(index: number): void {
    this.inputs.update((current) => current.filter((_, i) => i != index))
    this.selectionIndex.set(-1)
    this.onChangeInput()
  }

  protected selectInput(index: number): void {
    console.log('index : ', index)
    this.selectionIndex.set(index)
    console.log('selction : ', this.selection)
  }

  protected onReorder(event: CdkDragDrop<PleInput[]>) {
    if (this.readOnly()) return
    this.inputs.update((current) => {
      const updated = [...current]
      moveItemInArray(updated, event.previousIndex, event.currentIndex)
      return updated
    })
    this.selectInput(event.currentIndex)
    this.onChangeInput()
  }

  protected onChangeInput(value?: PleInput): void {
    if (value) {
      this.inputs.update((current) => {
        const updated = [...current]
        updated[this.selectionIndex()] = value
        return updated
      })
    }

    const content = {
      inputs: this.inputs(),
    }

    this.fileService.update(this.request.uri, JSON.stringify(content, null, 2))
  }

  protected trackByIndex(index: number) {
    return index
  }

  private async createEditor(): Promise<void> {
    const file = this.request.file!
    this.readOnly.set(file?.readOnly)
    if (this.resourceId && this.version) {
      this.inputFileService.init(this.resourceId, this.version, false) // should always work
    }
    try {
      const content = await this.fileService.open(this.request.uri)
      const data = JSON.parse(content.current ?? '{ "input": [] }')
      this.inputs.set(data.inputs)
    } catch {
      this.notificationService.publishError(`Unable to open and parse the PLC ${file.uri.path}`)
    }
  }
}
