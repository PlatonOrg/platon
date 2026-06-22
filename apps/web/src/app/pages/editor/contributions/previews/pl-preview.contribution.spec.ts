import { Injector } from '@angular/core'
import {
  CommandService,
  EditorService,
  FileService,
  ICommand,
  PreviewService,
  ToolbarService,
} from '@cisstech/nge-ide/core'
import { BehaviorSubject } from 'rxjs'
import { map } from 'rxjs/operators'
import { EditorPresenter } from '../../editor.presenter'
import { Contribution, patchBuiltinPreviewCommand, tryReloadPreviewInPlace } from './pl-preview.contribution'

// `pl-preview.contribution.ts` only needs the `PLAYER_EDITOR_PREVIEW` string constant from
// this package, but its barrel transitively pulls in player UI components that depend on
// `echarts/core`, an ESM-only module Jest can't parse. Stub the barrel to keep this test fast.
jest.mock('@platon/feature/player/browser', () => ({
  PLAYER_EDITOR_PREVIEW: 'editor-preview',
}))

const buildUri = (resource: string, version: string) =>
  ({
    authority: `${resource}:${version}`,
    toString: () => `platon://${resource}:${version}/main.json`,
  } as unknown as monaco.Uri)

const mockGroup = (activeResource?: monaco.Uri, isInPreviewMode = true) => ({
  isInPreviewMode,
  activeResource,
})

const mockIframe = (replace: jest.Mock | null) => ({ contentWindow: replace ? { location: { replace } } : null })

describe('tryReloadPreviewInPlace', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns false when no group is showing this preview', () => {
    const uri = buildUri('res-1', 'latest')
    const editorService = {
      findGroup: jest.fn().mockReturnValue(undefined),
      isActiveGroup: jest.fn(),
    } as unknown as EditorService

    expect(tryReloadPreviewInPlace(editorService, uri)).toBe(false)
    expect(editorService.isActiveGroup).not.toHaveBeenCalled()
  })

  it('returns false when the matching group is not the active one', () => {
    const uri = buildUri('res-1', 'latest')
    const editorService = {
      findGroup: jest.fn().mockReturnValue(mockGroup(uri)),
      isActiveGroup: jest.fn().mockReturnValue(false),
    } as unknown as EditorService
    const querySelectorAll = jest.spyOn(document, 'querySelectorAll')

    expect(tryReloadPreviewInPlace(editorService, uri)).toBe(false)
    expect(querySelectorAll).not.toHaveBeenCalled()
  })

  it('returns false when the active preview pane has no single matching iframe', () => {
    const uri = buildUri('res-1', 'latest')
    const editorService = {
      findGroup: jest.fn().mockReturnValue(mockGroup(uri)),
      isActiveGroup: jest.fn().mockReturnValue(true),
    } as unknown as EditorService
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([] as unknown as NodeListOf<Element>)

    expect(tryReloadPreviewInPlace(editorService, uri)).toBe(false)
  })

  it('returns false when several preview iframes match (split view ambiguity)', () => {
    const uri = buildUri('res-1', 'latest')
    const editorService = {
      findGroup: jest.fn().mockReturnValue(mockGroup(uri)),
      isActiveGroup: jest.fn().mockReturnValue(true),
    } as unknown as EditorService
    const iframe = mockIframe(jest.fn())
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([iframe, iframe] as unknown as NodeListOf<Element>)

    expect(tryReloadPreviewInPlace(editorService, uri)).toBe(false)
  })

  it('returns false when the matching iframe has no contentWindow', () => {
    const uri = buildUri('res-1', 'latest')
    const editorService = {
      findGroup: jest.fn().mockReturnValue(mockGroup(uri)),
      isActiveGroup: jest.fn().mockReturnValue(true),
    } as unknown as EditorService
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockIframe(null)] as unknown as NodeListOf<Element>)

    expect(tryReloadPreviewInPlace(editorService, uri)).toBe(false)
  })

  it('reloads the existing iframe via location.replace and returns true', () => {
    const uri = buildUri('res-1', '2.0')
    const editorService = {
      findGroup: jest.fn().mockReturnValue(mockGroup(uri)),
      isActiveGroup: jest.fn().mockReturnValue(true),
    } as unknown as EditorService
    const replace = jest.fn()
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockIframe(replace)] as unknown as NodeListOf<Element>)

    expect(tryReloadPreviewInPlace(editorService, uri)).toBe(true)
    expect(replace).toHaveBeenCalledTimes(1)

    const url = replace.mock.calls[0][0] as string
    expect(url).toContain('/player/preview/res-1')
    expect(url).toContain('version=2.0')
    expect(url).toMatch(/timestamp=\d+/)
    expect(url).toContain('editor-preview')
  })
})

describe('patchBuiltinPreviewCommand', () => {
  const buildCommand = (): ICommand => ({
    id: 'editor.commands.preview',
    label: 'Prévisualiser',
    enabled: true,
    execute: jest.fn().mockResolvedValue('original-result'),
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('forwards args and the return value to the original execute when reload in place is not possible', async () => {
    const command = buildCommand()
    const originalExecute = command.execute
    const editorService = {
      activeResource: undefined,
      findGroup: jest.fn(),
      isActiveGroup: jest.fn(),
    } as unknown as EditorService

    patchBuiltinPreviewCommand(command, editorService)
    const execute = command.execute as unknown as (...args: unknown[]) => Promise<string>
    const result = await execute('arg1', 'arg2')

    expect(originalExecute).toHaveBeenCalledWith('arg1', 'arg2')
    expect(result).toBe('original-result')
  })

  it('reloads in place instead of calling the original execute when possible', async () => {
    const uri = buildUri('res-1', 'latest')
    const command = buildCommand()
    const originalExecute = command.execute
    const editorService = {
      activeResource: uri,
      findGroup: jest.fn().mockReturnValue(mockGroup(uri)),
      isActiveGroup: jest.fn().mockReturnValue(true),
    } as unknown as EditorService
    const replace = jest.fn()
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockIframe(replace)] as unknown as NodeListOf<Element>)

    patchBuiltinPreviewCommand(command, editorService)
    await command.execute()

    expect(replace).toHaveBeenCalledTimes(1)
    expect(originalExecute).not.toHaveBeenCalled()
  })
})

describe('Contribution', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('patches built-in preview commands exactly once, regardless of how many times they appear in later registry updates', () => {
    const previewCommand: ICommand = {
      id: 'editor.commands.preview',
      label: 'Prévisualiser',
      enabled: true,
      execute: jest.fn(),
    }
    const reloadCommand: ICommand = {
      id: 'editor.commands.preview-reload',
      label: 'Recharger',
      enabled: true,
      execute: jest.fn(),
    }
    const unrelatedCommand: ICommand = {
      id: 'editor.commands.save',
      label: 'Enregistrer',
      enabled: true,
      execute: jest.fn(),
    }

    let patchCount = 0
    const trackPatches = (command: ICommand) => {
      let current = command.execute
      Object.defineProperty(command, 'execute', {
        configurable: true,
        get: () => current,
        set: (fn) => {
          patchCount++
          current = fn
        },
      })
    }
    trackPatches(previewCommand)
    trackPatches(reloadCommand)

    const registry$ = new BehaviorSubject<ICommand[]>([])
    const commandService = {
      register: jest.fn(),
      find: jest.fn(),
      findAll: jest.fn((predicate: (command: ICommand) => boolean) =>
        registry$.pipe(map((cmds) => cmds.filter(predicate)))
      ),
    } as unknown as CommandService

    const editorService = {
      registerCommands: jest.fn(),
      activeResource: undefined,
      findGroup: jest.fn(),
      isActiveGroup: jest.fn(),
    } as unknown as EditorService

    const injector = {
      get: (token: unknown) => {
        if (token === EditorPresenter) return { findOwnerResource: jest.fn() } as unknown as EditorPresenter
        if (token === FileService) return {} as unknown as FileService
        if (token === EditorService) return editorService
        if (token === PreviewService) return { register: jest.fn() } as unknown as PreviewService
        if (token === ToolbarService) return { registerButton: jest.fn() } as unknown as ToolbarService
        if (token === CommandService) return commandService
        throw new Error(`unexpected injector token: ${String(token)}`)
      },
    } as unknown as Injector

    const contribution = new Contribution()
    contribution.activate(injector)

    // The vendor's EditorContribution may register its commands before or after ours -
    // simulate both the preview command arriving alone, then the reload command joining,
    // then an unrelated, later registration re-emitting the same two commands again.
    registry$.next([previewCommand, unrelatedCommand])
    registry$.next([previewCommand, reloadCommand, unrelatedCommand])
    registry$.next([previewCommand, reloadCommand, unrelatedCommand])

    expect(patchCount).toBe(2)
    expect(unrelatedCommand.execute).not.toHaveBeenCalled()

    void contribution.deactivate()
  })
})
