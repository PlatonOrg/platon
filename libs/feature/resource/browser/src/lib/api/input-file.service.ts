import { inject, Injectable, OnDestroy } from '@angular/core'
import { ResourceFileService } from './file.service'
import { lastValueFrom } from 'rxjs'
import { DialogService } from '@platon/core/browser'

const path = '/api/v1/files/' // prefix of the path to store file

/** store for each component the current file url and the last saved file url */
class Info {
  lastSaveUrl: string
  currentUrl: string

  constructor(lastSaveUrl: string) {
    this.lastSaveUrl = lastSaveUrl
    this.currentUrl = lastSaveUrl
  }
}

/**
 * file service for upload/update file for the input-file
 */
@Injectable({ providedIn: 'root' })
export class InputFileService implements OnDestroy {
  private resourceId = ''
  private version = ''
  private isBuilder = false
  private displayMessage = false
  private files: Map<string, Info> = new Map()

  private readonly resourcefileService = inject(ResourceFileService) // to upload file, because Monaco.Uri doesn't work
  private readonly dialogService = inject(DialogService)

  constructor() {
    // try to remove the files that were uploaded and are not used anymore
    window.addEventListener('beforeunload', () => this.cleanupSync())
  }

  /** initialize the service
   * @param resourceId id of the resource
   * @param isBuilder allow to save the url in order to delete the file when add one from user file
   * @param displayMessage optional argument, if true send message to user with dialogService (default false)
   * @remarks if 'isBuilder' is true don't forget to register every file component
   */
  init(resourceId: string, version: string, isBuilder: boolean, displayMessage?: boolean) {
    this.resourceId = resourceId
    this.version = version
    this.isBuilder = isBuilder
    this.displayMessage = displayMessage ? displayMessage : false
  }

  /** register a component in the service
   * @param name the component name in the list of component
   * @param reference component value without the "@copycontent" or "@copyurl"
   */
  register(name: string, reference: string) {
    if (!this.files.has(name)) {
      if (reference.startsWith('/')) {
        reference = reference.replace('/', '')
      }
      const [resourceId, versionAndName] = reference.split(':') // resource id, version/file name
      const url = reference === '' ? '' : path + resourceId + '/' + versionAndName.split('/')[1]
      this.files.set(name, new Info(url))
    }
  }

  /** tell if it's the plo builder page*/
  isModeBuilder(): boolean {
    return this.isBuilder
  }

  /** give the resource version */
  resourceVersion(): string {
    return this.version
  }

  /** send dialogService message to user with this.dialogService.error or this.dialogService.success
   * @param message message to send
   * @param error optional argument, if true, use this.dialogService.error, default i's false
   */
  private openDialogue(message: string, error?: boolean) {
    const errorValue = error ? error : false
    if (this.displayMessage) {
      if (errorValue) {
        this.dialogService.error(message)
      } else {
        this.dialogService.success(message)
      }
    }
  }

  /** to call when user clic on the cross to remove the file*/
  async remove(inputName: string) {
    const info = this.files.get(inputName)
    if (!info) {
      this.openDialogue('Impossible de trouver le composant.', true)
      return
    }
    if (info.currentUrl != info.lastSaveUrl) {
      await this.deleteFile(info.currentUrl)
      info.currentUrl = ''
      return // skip the openDialogue below
    }
    info.currentUrl = ''
    this.openDialogue('Sauvegarder pour supprimer définitivement le fichier.')
  }

  /** to call when a file from oustide platon is drop
   *
   * @return the name of the file uploaded
   */
  async change(inputName: string, file: File): Promise<string> {
    if (!this.isBuilder) {
      // upload from outside the builder page
      const url = path + this.resourceId + '/?version=latest'
      const name = await this.uploadFile(url, file)
      this.openDialogue('Fichier ' + name + ' ajouté.')
      return name
    }
    const info = this.files.get(inputName)
    if (!info) {
      this.openDialogue('Impossible de trouver le composant.', true)
      return ''
    }
    if (info.currentUrl != info.lastSaveUrl && info.currentUrl != '') {
      await this.deleteFile(info.currentUrl)
    }
    const url = path + this.resourceId + '/?version=latest'
    const name = await this.uploadFile(url, file)
    info.currentUrl = path + this.resourceId + '/' + name
    if (name === '') {
      this.openDialogue("N'a pas pu extraire le nom du fichier ajouté.")
    } else {
      this.openDialogue('Fichier ' + name + ' ajouté.')
    }
    return name
  }

  /** call the service that upload file */
  private async uploadFile(url: string, file: File): Promise<string> {
    return (await lastValueFrom(this.resourcefileService.upload({ url: url }, file))).resource
  }

  /** ignore if url is '', remove only if the url as the same id that the one save on the service*/
  private async deleteFile(url: string) {
    try {
      if (url === '') {
        return
      }
      if (!this.isDeletable(url)) {
        return
      }
      await lastValueFrom(this.resourcefileService.delete({ url: url }))
      this.openDialogue('fichier ' + url.split('/').pop() + ' supprimé')
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier : ', error)
      this.openDialogue('Erreur lors de la suppresion du fichier.', true)
    }
  }

  /** indicate if you are allow to delete the file or not*/
  private isDeletable(url: string): boolean {
    const splitUrl = url.split('/')
    const oldResourceId = splitUrl[4].split(':')[0]
    const name = splitUrl.pop()
    if (!name) {
      // should never append
      this.openDialogue("Erreur n'a pas trouver le nom du fichier.", true)
      return false
    }
    const splitName = name.split('.')
    if (splitName[0] === 'main') {
      const extension = ['ple', 'plo', 'plc']
      if (extension.includes(splitName[1])) {
        this.openDialogue('Le fichier ' + name + " n'est pas supprimable.", true)
        return false
      }
    }
    if (splitName[0] === 'readme' && splitName[1] === 'md') {
      this.openDialogue('Le fichier ' + name + " n'est pas supprimable.", true)
      return false
    }
    if (oldResourceId != this.resourceId) {
      this.openDialogue("Vous ne pouvez pas supprimer le fichier d'une autre ressource.", true)
      console.log("Pour supprimer le fichier aller à la ressource d'id : " + oldResourceId)
      return false
    }
    if (this.version != 'latest') {
      this.openDialogue(
        "Vous ne pouvez pas supprimer de fichier dans une ressource dont la version est différente de 'latest'.",
        true
      )
      return false
    }
    return true
  }

  /** give the url of the file indicate in the value of the component
   * @param InputValue the component's value
   * @return the url of the file in the database
   */
  urlFile(inputValue: string): string {
    let reference = (inputValue.replace(/@copycontent|@copyurl/g, '') || '').trim() // current file
    if (reference === '') {
      return ''
    }
    reference = reference.replace('/', '')
    const [resourceId, versionAndName] = reference.split(':') // resource id, latest/file name
    const uri = path + resourceId + '/' + versionAndName.split('/')[1] + '?download&version=' + this.version // uri for display and donwload
    return uri
  }

  /** update the file saved in the component 'name'
   * @param name the component name in the list of component
   * @param content the new content
   * @param onSuccess optional, function to execute on success
   */
  update(name: string, content: string, onSuccess?: () => void) {
    const info = this.files.get(name)
    if (!info) {
      console.error("N'as pas réussi à trouver le fichier.")
      this.openDialogue('Une erreur est survenue.', true)
      return // should never append
    }
    this.resourcefileService.update({ url: info.currentUrl }, { content: content }).subscribe({
      next: () => {
        this.dialogService.success('Fichier mis à jour.')
        if (onSuccess) {
          onSuccess()
        }
      },
      error: (err) => {
        console.error('Erreur lors du de la mise à jour du fichier ', err)
      },
    })
  }

  /** remove the last save file to keep the one added */
  async save() {
    this.files.forEach((info, _) => {
      if (info.currentUrl != info.lastSaveUrl) {
        void this.deleteFile(info.lastSaveUrl)
        info.lastSaveUrl = info.currentUrl
      }
    })
  }

  /** try to remove that are not use when closing the page*/
  private cleanupSync() {
    this.files.forEach((info) => {
      if (info.currentUrl && info.currentUrl !== info.lastSaveUrl) {
        if (this.isDeletable(info.currentUrl)) {
          void fetch(info.currentUrl, { method: 'DELETE', keepalive: true })
        }
      }
    })
  }

  /** remove file that are not use when closing the service */
  ngOnDestroy() {
    this.cleanupTemporaryFiles()
  }

  /** remove file that are not use when closing the component*/
  private cleanupTemporaryFiles() {
    this.files.forEach((info) => {
      if (info.currentUrl && info.currentUrl !== info.lastSaveUrl) {
        this.deleteFile(info.currentUrl).catch((err) => console.error('Cleanup failed', err))
      }
    })
  }
}
