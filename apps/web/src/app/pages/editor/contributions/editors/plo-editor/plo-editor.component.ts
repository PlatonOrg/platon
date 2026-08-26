import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, inject } from '@angular/core'
import { Editor, FileService, NotificationService, OpenRequest } from '@cisstech/nge-ide/core'
import { EXERCISE_CONFIG_FILE, PleInput, Variables } from '@platon/feature/compiler'
import { Subscription } from 'rxjs'
import { EditorPresenter } from '../../../editor.presenter'
import { ActivatedRoute } from '@angular/router'
import { InputFileService } from '@platon/feature/resource/browser'
import { CommonModule } from '@angular/common'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzListModule } from 'ng-zorro-antd/list'

import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzSwitchModule } from 'ng-zorro-antd/switch'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { PleInputEditorModule } from '../ple-input/ple-input.module'
@Component({
  selector: 'app-plo-editor',
  templateUrl: './plo-editor.component.html',
  styleUrls: ['./plo-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NzButtonModule,
    NzListModule,
    FormsModule,
    MatIconModule,
    NzIconModule,
    NzSwitchModule,
    NzToolTipModule,
    PleInputEditorModule,
  ],
})
export class PloEditorComponent implements OnInit, OnDestroy {
  private readonly fileService = inject(FileService)
  private readonly presenter = inject(EditorPresenter)
  private readonly notificationService = inject(NotificationService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  private readonly inputFileService = inject(InputFileService)

  private readonly subscriptions: Subscription[] = []
  private request!: OpenRequest

  protected readOnly?: boolean
  protected debug = false

  @Input()
  protected editor!: Editor

  protected inputs: PleInput[] = []
  protected overrides: Variables = {}
  protected selection: PleInput | undefined
  protected selectionIndex = -1

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

  protected selectInput(index: number): void {
    this.selection = this.inputs[index]
    this.selectionIndex = index
  }

  protected onChangeInput(value?: PleInput): void {
    if (value) {
      this.selection = value
      this.inputs[this.selectionIndex] = value
      this.overrides[value.name] = value.value
    }

    this.fileService.update(this.request.uri, JSON.stringify(this.overrides, null, 2))
    this.changeDetectorRef.detectChanges()
  }

  private async createEditor(): Promise<void> {
    const file = this.request.file!
    this.readOnly = file?.readOnly

    const template = this.presenter.currentResource.templateId
    const version = this.presenter.currentResource.templateVersion

    if (!template || !version) {
      throw new Error('Template ID or version is missing')
    }

    try {
      const [content, configContent] = await Promise.all([
        this.fileService.open(this.request.uri),
        this.fileService.readFile(this.presenter.buildUri(template, version, EXERCISE_CONFIG_FILE)),
      ])
      this.overrides = JSON.parse(content.current ?? '{}')

      if (!configContent) {
        this.notificationService.publishError(`No config file found in the template ${template}:${version}`)
        return
      }
      if (this.resourceId && this.version) {
        //should always work
        this.inputFileService.init(this.resourceId, this.version, false)
      }
      const config = JSON.parse(configContent)
      this.inputs = config.inputs
      this.inputs.forEach((input) => {
        input.value = this.overrides[input.name] ?? input.value
      })
    } catch {
      this.notificationService.publishError(`Unable to open and parse the PLO ${file.uri.path}`)
    }
    this.changeDetectorRef.detectChanges()
  }
}
