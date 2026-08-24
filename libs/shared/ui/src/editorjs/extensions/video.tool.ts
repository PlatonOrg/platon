import { BlockTool, BlockToolConstructorOptions, BlockToolData } from '@editorjs/editorjs'
import { EditorJsFileUploader } from '../editorjs-file-uploader'

export interface VideoData {
  url: string
  caption?: string
}

interface VideoConfig {
  uploader?: EditorJsFileUploader
}

// Bloc vidéo maison : ni @editorjs/embed (limité à un jeu fixe de plateformes tierces YouTube/Vimeo/etc.
// avec iframe oEmbed) ni @editorjs/attaches (pièce jointe générique, pas de lecteur inline) ne couvrent
// l'upload d'un fichier vidéo perso ou le collage d'une URL directe (.mp4...) lu en <video>.
export class VideoTool implements BlockTool {
  static get toolbox() {
    return {
      title: 'Vidéo',
      icon: '<svg width="18" height="14" viewBox="0 0 18 14" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="11" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M14 4.5 17 2.5v9L14 9.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>',
    }
  }

  static get isReadOnlySupported(): boolean {
    return true
  }

  private data: VideoData
  private readonly readOnly: boolean
  private readonly uploader?: EditorJsFileUploader
  private wrapper?: HTMLDivElement
  private captionElement?: HTMLDivElement

  constructor({ data, config, readOnly }: BlockToolConstructorOptions<VideoData, VideoConfig>) {
    this.readOnly = !!readOnly
    this.uploader = config?.uploader
    this.data = {
      url: data?.url ?? '',
      caption: data?.caption ?? '',
    }
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div')
    this.wrapper.classList.add('ce-video')

    if (this.data.url) {
      this.renderPlayer()
    } else {
      this.renderForm()
    }

    return this.wrapper
  }

  save(): BlockToolData<VideoData> {
    return {
      url: this.data.url,
      caption: this.captionElement?.innerHTML ?? this.data.caption ?? '',
    }
  }

  private renderForm(error?: string): void {
    if (!this.wrapper) {
      return
    }
    this.wrapper.innerHTML = ''

    const form = document.createElement('div')
    form.classList.add('ce-video__form')

    if (this.uploader) {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = 'video/*'
      fileInput.classList.add('ce-video__file-input')
      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0]
        if (file) {
          this.upload(() => this.uploader!.uploadByFile(file))
        }
      })

      const fileButton = document.createElement('button')
      fileButton.type = 'button'
      fileButton.classList.add('ce-video__button')
      fileButton.textContent = 'Choisir une vidéo'
      fileButton.addEventListener('click', () => fileInput.click())

      form.appendChild(fileButton)
      form.appendChild(fileInput)
    }

    const urlInput = document.createElement('input')
    urlInput.type = 'text'
    urlInput.placeholder = 'Ou collez une URL vidéo (.mp4, .webm...)'
    urlInput.classList.add('ce-video__url-input')
    urlInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        this.submitUrl(urlInput.value)
      }
    })
    urlInput.addEventListener('blur', () => this.submitUrl(urlInput.value))
    form.appendChild(urlInput)

    this.wrapper.appendChild(form)

    if (error) {
      const errorElement = document.createElement('div')
      errorElement.classList.add('ce-video__error')
      errorElement.textContent = error
      this.wrapper.appendChild(errorElement)
    }
  }

  private submitUrl(url: string): void {
    const trimmed = url.trim()
    if (!trimmed) {
      return
    }

    if (this.uploader) {
      this.upload(() => this.uploader!.uploadByUrl(trimmed))
    } else {
      this.data.url = trimmed
      this.renderPlayer()
    }
  }

  private upload(action: () => Promise<{ file: { url: string } }>): void {
    if (!this.wrapper) {
      return
    }
    this.wrapper.innerHTML = ''
    const loading = document.createElement('div')
    loading.classList.add('ce-video__loading')
    loading.textContent = 'Envoi en cours…'
    this.wrapper.appendChild(loading)

    action()
      .then((response) => {
        this.data.url = response.file.url
        this.renderPlayer()
      })
      .catch(() => this.renderForm("Échec de l'envoi de la vidéo. Réessayez."))
  }

  private renderPlayer(): void {
    if (!this.wrapper) {
      return
    }
    this.wrapper.innerHTML = ''

    const video = document.createElement('video')
    video.src = this.data.url
    video.controls = true
    video.classList.add('ce-video__player')
    this.wrapper.appendChild(video)

    if (!this.readOnly || this.data.caption) {
      this.captionElement = document.createElement('div')
      this.captionElement.classList.add('ce-video__caption')
      this.captionElement.contentEditable = this.readOnly ? 'false' : 'true'
      this.captionElement.dataset['placeholder'] = 'Légende (optionnel)'
      this.captionElement.innerHTML = this.data.caption ?? ''
      this.wrapper.appendChild(this.captionElement)
    }
  }
}
