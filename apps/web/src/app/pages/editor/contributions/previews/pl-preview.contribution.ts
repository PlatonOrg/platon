import { Injectable, Injector, NgModule } from '@angular/core'
import {
  CONTRIBUTION,
  CommandService,
  EditorService,
  FileService,
  ICommand,
  IContribution,
  Preview,
  PreviewHandler,
  PreviewService,
  PreviewTypes,
  ToolbarService,
} from '@cisstech/nge-ide/core'
import { CodIcon } from '@cisstech/nge/ui/icon'
import { ACTIVITY_MAIN_FILE, EXERCISE_MAIN_FILE } from '@platon/feature/compiler'
import { PLAYER_EDITOR_PREVIEW } from '@platon/feature/player/browser'
import { ResourceTypes } from '@platon/feature/resource/common'
import { Subscription } from 'rxjs'
import { EditorPresenter } from '../../editor.presenter'
import { PLATON_SCHEME, ResourceFileSystemProvider } from '../file-system'

const canPreviewUri = (uri: monaco.Uri, owner: { type: ResourceTypes }) => {
  if (!owner || owner.type === 'CIRCLE') return false
  return uri.path === `/${EXERCISE_MAIN_FILE}` || uri.path === `/${ACTIVITY_MAIN_FILE}`
}

const buildPreviewUrl = (uri: monaco.Uri, params?: string[]) => {
  const [resource, version] = uri.authority.split(':')
  const queryParams = params ? '&' + params?.join('&') : ''
  return `/player/preview/${resource}?version=${version}${queryParams}`
}

const buildPreview = (uri: monaco.Uri, counter: number = 0): Preview => ({
  type: PreviewTypes.URL,
  data: buildPreviewUrl(uri, [`counter=${counter}`, PLAYER_EDITOR_PREVIEW]),
})

class PreviewInNewTabCommand implements ICommand {
  readonly id = 'platon.contrib.ple.commands.preview-in-new-tab'
  readonly label = 'Prévisualiser dans un nouvel onglet'
  readonly icon = new CodIcon('browser')

  constructor(private readonly presenter: EditorPresenter, private readonly editorService: EditorService) {}

  get enabled(): boolean {
    const { activeResource } = this.editorService
    if (!activeResource) return false
    const { owner } = this.presenter.findOwnerResource(activeResource)
    if (!owner) return false
    return canPreviewUri(activeResource, owner)
  }

  async execute(): Promise<void> {
    const { activeResource } = this.editorService
    if (!activeResource) return

    window.open(buildPreviewUrl(activeResource), '_blank')
  }
}

class ToolbarPreviewCommand implements ICommand {
  readonly id = 'platon.contrib.toolbar.commands.preview'
  readonly label = 'Prévisualiser'
  readonly icon = new CodIcon('play-circle')

  constructor(
    private readonly presenter: EditorPresenter,
    private readonly fileService: FileService,
    private readonly editorService: EditorService
  ) {}
  get enabled(): boolean {
    const { currentResource } = this.presenter
    if (!currentResource) return false
    return currentResource.type !== 'CIRCLE'
  }

  async execute(): Promise<void> {
    const { currentVersion, currentResource } = this.presenter
    if (!currentResource) return
    const fs = this.fileService.getProvider(PLATON_SCHEME) as ResourceFileSystemProvider
    const uri = fs
      .buildUri(
        currentResource.id,
        currentVersion,
        currentResource.type === ResourceTypes.EXERCISE ? EXERCISE_MAIN_FILE : ACTIVITY_MAIN_FILE
      )
      .with({
        query: PLAYER_EDITOR_PREVIEW,
      })
    this.editorService.open(uri, {
      preview: buildPreview(uri),
    })
  }
}

@Injectable()
export class Contribution implements IContribution {
  private readonly subscriptions: Subscription[] = []
  readonly id = 'platon.contrib.preview'

  activate(injector: Injector) {
    const presenter = injector.get(EditorPresenter)
    const fileService = injector.get(FileService)
    const editorService = injector.get(EditorService)
    const previewService = injector.get(PreviewService)
    const toolbarService = injector.get(ToolbarService)
    const commandService = injector.get(CommandService)

    previewService.register(
      new (class implements PreviewHandler {
        private counter = 0 // temporary solution to trigger change detection of the preview editor

        canHandle(uri: monaco.Uri): boolean {
          const { currentResource } = presenter
          if (!currentResource) return false
          const { owner } = presenter.findOwnerResource(uri)
          if (!owner) return false
          return canPreviewUri(uri, owner)
        }

        async handle(_: Injector, uri: monaco.Uri): Promise<Preview> {
          return Promise.resolve(buildPreview(uri, this.counter++))
        }
      })()
    )

    editorService.registerCommands(new PreviewInNewTabCommand(presenter, editorService))

    const previewFromToolbar = new ToolbarPreviewCommand(presenter, fileService, editorService)

    commandService.register(previewFromToolbar)
    toolbarService.registerButton({
      command: previewFromToolbar,
      colors: {
        foreground: 'white',
        background: 'var(--brand-color-primary)',
      },
    })
  }

  deactivate(): void | Promise<void> {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }
}

@NgModule({
  providers: [
    {
      provide: CONTRIBUTION,
      multi: true,
      useClass: Contribution,
    },
  ],
})
export class PlPreviewContributionModule {}
