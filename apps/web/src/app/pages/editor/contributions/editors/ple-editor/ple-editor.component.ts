/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, inject } from '@angular/core'
import { FormBuilder } from '@angular/forms'
import { Editor, FileService, OpenRequest } from '@cisstech/nge-ide/core'
import { PleInput, Variables } from '@platon/feature/compiler'
import { ResourceFileService } from '@platon/feature/resource/browser'
import { editorJsFromRawString, editorJsToRawString } from '@platon/shared/ui'
import { Subscription, debounceTime, firstValueFrom, skip } from 'rxjs'

import { ReactiveFormsModule } from '@angular/forms'
import { NzCollapseModule } from 'ng-zorro-antd/collapse'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzListModule } from 'ng-zorro-antd/list'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'
import { UiEditorJsModule } from '@platon/shared/ui'
import { PleInputEditorModule } from '../ple-input/ple-input.module'

const HIDDEN_VARIABLES = ['author', 'title', 'statement', 'form', 'builder', 'grader']

@Component({
  selector: 'app-ple-editor',
  templateUrl: './ple-editor.component.html',
  styleUrls: ['./ple-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NzCollapseModule,
    NzFormModule,
    NzListModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    UiEditorJsModule,
    PleInputEditorModule,
  ],
})
export class PleEditorComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder)
  private readonly fileService = inject(FileService)
  private readonly resourceFileService = inject(ResourceFileService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  private readonly subscriptions: Subscription[] = []
  private request!: OpenRequest

  @Input()
  protected editor!: Editor

  protected form = this.fb.group({
    title: [''],
    statement: [editorJsFromRawString('')],
    form: [editorJsFromRawString('')],
    builder: [
      {
        name: 'builder',
        type: 'code',
        description: 'The builder is used to generate the exercise',
        value: '',
        options: { language: 'python' },
      } as PleInput,
    ],
    grader: [
      {
        name: 'builder',
        type: 'code',
        description: 'The grader is used to grade the exercise',
        value: '',
        options: { language: 'python' },
      } as PleInput,
    ],
    variables: [[] as PleInput[]],
  })

  protected ready = false
  protected reservedNames = HIDDEN_VARIABLES.slice()

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.editor.onChangeRequest.subscribe((request) => {
        this.request = request
        this.createEditor().catch(console.error)
      })
    )

    this.subscriptions.push(
      this.form.valueChanges.pipe(skip(1), debounceTime(300)).subscribe(this.onChangeData.bind(this))
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  private async onChangeData(): Promise<void> {
    const { value } = this.form
    const [resource, version] = this.request.uri.authority.split(':')

    const newContent = await firstValueFrom(
      this.resourceFileService.transformExercise(
        resource,
        {
          changes: {
            ...value.variables?.reduce((acc, curr) => {
              acc[curr.name] = curr.value
              return acc
            }, {} as Variables),

            form: editorJsToRawString(value.form || ''),
            title: editorJsToRawString(value.title || ''),
            statement: editorJsToRawString(value.statement || ''),

            grader: value.grader?.value || '',
            builder: value.builder?.value || '',
          },
        },
        version
      )
    )

    this.fileService.update(this.request.uri, newContent)
  }

  private async createEditor(): Promise<void> {
    const file = this.request.file!

    const [resource, version] = this.request.uri.authority.split(':')
    const [source] = await Promise.all([
      firstValueFrom(this.resourceFileService.compileExercise(resource, version)),
      this.fileService.open(this.request.uri),
    ])

    const { variables } = source.ast
    const sandbox = source.variables['sandbox'] || 'javascript'

    this.form.patchValue({
      title: (variables['title'] as string) || '',
      statement: editorJsFromRawString(variables['statement'] as string),
      form: editorJsFromRawString(variables['form'] as string),
      builder: {
        name: 'builder',
        type: 'code',
        description: 'The builder is used to generate the exercise',
        options: { language: sandbox },
        value: variables['builder'] || '',
      } as PleInput,
      grader: {
        name: 'grader',
        type: 'code',
        description: 'The grader is used to grade the exercise',
        options: { language: sandbox },
        value: variables['grader'] || '',
      } as PleInput,
      variables: Object.keys(variables)
        .filter((variable) => !HIDDEN_VARIABLES.includes(variable))
        .map((name) => ({
          name,
          type: '',
          description: '',
          value: variables[name],
        })),
    })

    if (file?.readOnly) {
      this.form.disable({ emitEvent: false })
    }

    this.ready = true
    this.changeDetectorRef.markForCheck()
  }
}
