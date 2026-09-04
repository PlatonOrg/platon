import { BlockTool, BlockToolConstructorOptions, BlockToolData } from '@editorjs/editorjs'
import { EditorJsExercisePicker } from '../editorjs-exercise-picker'
import { isExercisePreviewResizeMessage } from '../exercise-preview-resize'

export interface ExerciseData {
  resourceId: string
  resourceVersion: string
  title?: string
}

interface ExerciseConfig {
  picker?: EditorJsExercisePicker
}

// Bloc "exercice" maison : embarque un exercice PLaTon existant, jouable en mode essai libre
// (route /player/preview/:resourceId, sans session ni note) directement dans une leçon.
export class ExerciseTool implements BlockTool {
  static get toolbox() {
    return {
      title: 'Exercice',
      icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 8.5 7 10.5 11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    }
  }

  static get isReadOnlySupported(): boolean {
    return true
  }

  private data: ExerciseData
  private readonly readOnly: boolean
  private readonly picker?: EditorJsExercisePicker
  private wrapper?: HTMLDivElement
  private resizeListener?: (event: MessageEvent) => void

  constructor({ data, config, readOnly }: BlockToolConstructorOptions<ExerciseData, ExerciseConfig>) {
    this.readOnly = !!readOnly
    this.picker = config?.picker
    this.data = {
      resourceId: data?.resourceId ?? '',
      resourceVersion: data?.resourceVersion ?? '',
      title: data?.title ?? '',
    }
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div')
    this.wrapper.classList.add('ce-exercise')

    if (this.data.resourceId) {
      this.renderExercise()
    } else {
      this.renderPicker()
    }

    return this.wrapper
  }

  save(): BlockToolData<ExerciseData> {
    return { ...this.data }
  }

  destroy(): void {
    this.detachResizeListener()
  }

  private renderPicker(): void {
    if (!this.wrapper) {
      return
    }
    this.wrapper.innerHTML = ''

    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('ce-exercise__button')
    button.textContent = 'Choisir un exercice'
    button.addEventListener('click', () => this.openPicker())
    this.wrapper.appendChild(button)
  }

  private openPicker(): void {
    if (!this.picker) {
      return
    }
    this.picker
      .pick()
      .then((result) => {
        if (!result) {
          return
        }
        this.data = result
        this.renderExercise()
      })
      .catch(() => {
        //
      })
  }

  private renderExercise(): void {
    if (!this.wrapper) {
      return
    }
    this.wrapper.innerHTML = ''

    if (this.data.title) {
      const title = document.createElement('div')
      title.classList.add('ce-exercise__title')
      title.textContent = this.data.title
      this.wrapper.appendChild(title)
    }

    const iframe = document.createElement('iframe')
    iframe.classList.add('ce-exercise__frame')

    iframe.src = `/player/preview/${this.data.resourceId}?version=${encodeURIComponent(
      this.data.resourceVersion || 'latest'
    )}&autoResize=true`
    this.wrapper.appendChild(iframe)
    this.attachResizeListener(iframe)

    if (!this.readOnly && this.picker) {
      const changeButton = document.createElement('button')
      changeButton.type = 'button'
      changeButton.classList.add('ce-exercise__change-button')
      changeButton.textContent = "Changer d'exercice"
      changeButton.addEventListener('click', () => this.openPicker())
      this.wrapper.appendChild(changeButton)
    }
  }

  private attachResizeListener(iframe: HTMLIFrameElement): void {
    this.detachResizeListener()

    this.resizeListener = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === iframe.contentWindow &&
        isExercisePreviewResizeMessage(event.data)
      ) {
        iframe.style.height = `${event.data.height}px`
      }
    }
    window.addEventListener('message', this.resizeListener)
  }

  private detachResizeListener(): void {
    if (this.resizeListener) {
      window.removeEventListener('message', this.resizeListener)
      this.resizeListener = undefined
    }
  }
}
