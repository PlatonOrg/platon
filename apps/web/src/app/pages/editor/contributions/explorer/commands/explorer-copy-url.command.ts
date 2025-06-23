import { inject, Injectable } from '@angular/core'
import { CommandGroups, ExplorerService, IExplorerCommand } from '@cisstech/nge-ide/explorer'
import { FaIcon } from '@cisstech/nge/ui/icon'

const imageExtensions = ['.jpg', '.jpeg', '.gif', '.png', '.webp', '.svg']

@Injectable()
export class ExplorerCopyUrlCommand implements IExplorerCommand {
  readonly group = CommandGroups.GROUP_CUT_COPY_PASTE
  readonly id = 'explorer.command.copy-url'
  readonly icon = new FaIcon('fas fa-copy')
  readonly label = "Copier l'URL de l'image"

  private readonly explorerService = inject(ExplorerService)

  get enabled(): boolean {
    const [selection] = this.explorerService.selections()
    console.log('enabled', !!selection && imageExtensions.some((ext) => selection.uri.path.endsWith(ext)))
    return !!selection && imageExtensions.some((ext) => selection.uri.path.endsWith(ext))
  }

  async execute(): Promise<void> {
    const [selection] = this.explorerService.selections()
    if (!selection || !selection.url) return

    const { origin } = location

    await navigator.clipboard.writeText(origin + selection.url)
  }
}
