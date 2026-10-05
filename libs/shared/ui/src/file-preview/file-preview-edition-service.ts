import { inject, Injectable, signal } from '@angular/core'
import { extractSupportedExtension } from './file-preview'
import { ActivatedRouteSnapshot, Router } from '@angular/router'

declare const monaco: any

/** service for file editing for the build page */
@Injectable({ providedIn: 'root' })
export class EditFilePreviewService {
  private models = new Map<string, monaco.editor.ITextModel>() // Maintain an editor per component to enable Ctrl-Z. (the key is the url of the file)

  isEditing = signal<boolean>(false)
  private currentFileContents = new Map<string, string>() // must correspond to the last saved content of each file edited
  private supportedExtension = ['txt', 'md', 'csv', 'json'] // file extension supported for editing
  refreshRequest = signal<number>(0) // help refresh the content after editing
  private readonly router = inject(Router)

  /** give the first resource id found
   * @return string : the resource id | null if no id has been found */
  private getActiveResourceId(): string | null {
    let currentRoute: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root
    while (currentRoute) {
      if (currentRoute.paramMap.has('id')) {
        return currentRoute.paramMap.get('id')
      }
      currentRoute = currentRoute.firstChild
    }
    return null
  }

  /**
   * @param src file url
   * @return true if the file support editing, otherwise false */
  isEditable(src: string): boolean {
    const resourceId = this.getActiveResourceId()
    const splitUrl = src.split('/')
    const oldResourceId = splitUrl[4].split(':')[0]
    if (oldResourceId != resourceId) {
      return false // cannot edit a file from another resource.
    }
    const extension = extractSupportedExtension(src)
    return extension ? this.supportedExtension.includes(extension) : false
  }

  /** create the model and save it in the service
   * @param id : file url
   * @param lang optional, editor lang
   */
  createModel(id: string, lang = 'plaintext') {
    let model = this.models.get(id)
    const currentContent = this.currentFileContents.get(id)
    if (!model && currentContent) {
      model = monaco.editor.createModel(currentContent, lang)
      if (model) {
        this.models.set(id, model)
        model.onDidChangeContent(() => this.requestRefresh())
      } // else should never append
    }
  }

  /**
   * @param id file url
   * @return editor model if exist
   */
  getModel(id: string): monaco.editor.ITextModel | undefined {
    return this.models.get(id)
  }

  /** Nettoyage quand on change vraiment de fichier ou de ressource */
  clearModel(id: string) {
    const model = this.models.get(id)
    if (model) {
      model.dispose()
      this.models.delete(id)
      this.currentFileContents.delete(id)
    }
  }

  /**refresh (help angular to update everything) */
  requestRefresh() {
    this.refreshRequest.update((n) => n + 1)
  }

  /** give the last save content for the file
   * @param id file url
   * @return the last content saved  for the file or '' if it's doesn't exist
   */
  getCurrentFileContent(id: string): string {
    const content = this.currentFileContents.get(id)
    return content ? content : ''
  }

  /** must correspond to the actual file content saved on the database.
   * It update the map of the saved content
   * @param id file url
   * @param content file's content
   */
  setCurrentContent(id: string, content: string) {
    this.currentFileContents.set(id, content)
  }

  /** get the content of the file check the editor, then the last saved content
   * @return the content or '' if there is no file correponding in this service
   */
  data(id: string): string {
    const model = this.models.get(id)
    if (!model) {
      return this.getCurrentFileContent(id)
    }
    return model.getValue()
  }
}
