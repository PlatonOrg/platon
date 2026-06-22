import { Injectable, Injector, NgModule } from '@angular/core'
import {
  CONTRIBUTION,
  CommandService,
  EditorService,
  FileService,
  ICommand,
  IContribution,
  KeyCodes,
  KeyModifiers,
  Keybinding,
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

const buildPreview = (uri: monaco.Uri): Preview => ({
  type: PreviewTypes.URL,
  data: buildPreviewUrl(uri, [`timestamp=${Date.now()}`, PLAYER_EDITOR_PREVIEW]), // Add timestamp to avoid cache, might be changed later
})

// Re-opening an already shown preview through `editorService.open` makes its iframe
// navigate to a new URL (fresh timestamp), which the browser treats as a real navigation
// and adds to the tab's history. After a few previews, "back" has to unwind all of them
// before actually leaving the editor. Reloading the existing iframe via `location.replace`
// instead avoids growing that history.
export const tryReloadPreviewInPlace = (editorService: EditorService, uri: monaco.Uri): boolean => {
  // The preview always opens in its own group, separate from the code editor's group
  // (see EditorService.open: it picks a non-active group for previews), so the group
  // showing it is not necessarily the active one once focus moves back to the code.
  const group = editorService.findGroup(
    (g) => g.isInPreviewMode && g.activeResource?.toString(true) === uri.toString(true)
  )
  // There's no stable DOM hook tying an EditorGroup to its container, but the active
  // group is the only one rendered with this class. Bail out instead of guessing if the
  // matching group isn't the active one, so a split view with another preview open
  // elsewhere never gets its iframe reloaded by mistake.
  if (!group || !editorService.isActiveGroup(group)) return false

  const iframes = document.querySelectorAll<HTMLIFrameElement>('.editor-group--active .preview-editor iframe')
  if (iframes.length !== 1 || !iframes[0].contentWindow) return false

  iframes[0].contentWindow.location.replace(buildPreviewUrl(uri, [`timestamp=${Date.now()}`, PLAYER_EDITOR_PREVIEW]))
  return true
}

// @cisstech/nge-ide also ships its own "Prévisualiser"/"Recharger" buttons inside the
// preview tab's own toolbar (commands 'editor.commands.preview' and
// 'editor.commands.preview-reload', registered by its EditorContribution). They always
// reopen the preview through `editorService.open` too, so they have the same history
// growth issue. They're internal to the library (not part of its public API), so we can't
// import their classes - patch them in place by id instead, regardless of registration order.
export const patchBuiltinPreviewCommand = (command: ICommand, editorService: EditorService) => {
  const original = command.execute as (...args: unknown[]) => void | Promise<void>
  command.execute = (...args: unknown[]) => {
    const { activeResource } = editorService
    if (activeResource && tryReloadPreviewInPlace(editorService, activeResource)) {
      return
    }
    return original.apply(command, args)
  }
}

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
  readonly keybinding = new Keybinding({
    key: KeyCodes.ENTER,
    label: '⌘ ENTER',
    modifiers: [KeyModifiers.CTRL_CMD],
  })

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

    try {
      await this.editorService.saveAll()
    } catch (error) {
      console.error(error)
      return
    }

    if (tryReloadPreviewInPlace(this.editorService, uri)) {
      return
    }

    this.editorService
      .open(uri, {
        preview: buildPreview(uri),
      })
      .catch(console.error)
  }
}

export class ResourceCommand implements ICommand {
  readonly id = 'platon.contrib.toolbar.commands.resource'
  readonly label = 'Ressource'
  readonly icon = new CodIcon('link-external')

  constructor(private readonly presenter: EditorPresenter) {}

  get enabled(): boolean {
    const { currentResource } = this.presenter
    if (!currentResource) return false
    return true
  }

  async execute(): Promise<void> {
    window.open('resources/' + this.presenter.currentResource.id, '_blank')
  }
}

class BackToResourcesCommand implements ICommand {
  readonly id = 'platon.contrib.toolbar.commands.back-to-resources'
  readonly label = ''
  readonly icon = new CodIcon('arrow-left')

  get enabled(): boolean {
    return window.history.length > 1
  }

  async execute(): Promise<void> {
    window.history.back()
  }
}

@Injectable()
export class Contribution implements IContribution {
  private readonly subscriptions: Subscription[] = []
  private activated = false
  readonly id = 'platon.contrib.preview'

  activate(injector: Injector) {
    if (this.activated) return
    this.activated = true

    const presenter = injector.get(EditorPresenter)
    const fileService = injector.get(FileService)
    const editorService = injector.get(EditorService)
    const previewService = injector.get(PreviewService)
    const toolbarService = injector.get(ToolbarService)
    const commandService = injector.get(CommandService)

    previewService.register(
      new (class implements PreviewHandler {
        canHandle(uri: monaco.Uri): boolean {
          const { currentResource } = presenter
          if (!currentResource) return false
          const { owner } = presenter.findOwnerResource(uri)
          if (!owner) return false
          return canPreviewUri(uri, owner)
        }

        async handle(_: Injector, uri: monaco.Uri): Promise<Preview> {
          return Promise.resolve(buildPreview(uri))
        }
      })()
    )

    editorService.registerCommands(new PreviewInNewTabCommand(presenter, editorService))

    const patchedBuiltinCommands = new WeakSet<ICommand>()
    this.subscriptions.push(
      commandService
        .findAll((c) => c.id === 'editor.commands.preview' || c.id === 'editor.commands.preview-reload')
        .subscribe((commands) => {
          commands.forEach((command) => {
            if (patchedBuiltinCommands.has(command)) return
            patchedBuiltinCommands.add(command)
            patchBuiltinPreviewCommand(command, editorService)
          })
        })
    )

    const backToResourcesCommand = new BackToResourcesCommand()
    const previewFromToolbar = new ToolbarPreviewCommand(presenter, fileService, editorService)
    const resourceCommand = new ResourceCommand(presenter)

    commandService.register(previewFromToolbar)

    toolbarService.registerButton({
      command: backToResourcesCommand,
      buttonType: 'text',
      colors: {
        foreground: 'white',
        background: 'transparent',
      },
    })

    toolbarService.registerButton({
      command: previewFromToolbar,
      colors: {
        foreground: 'white',
        background: 'var(--brand-color-primary)',
      },
    })

    toolbarService.registerButton({
      command: resourceCommand,
      buttonType: 'text',
      colors: {
        foreground: 'white',
        background: 'transparent',
      },
    })
  }

  deactivate(): void | Promise<void> {
    this.activated = false
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
