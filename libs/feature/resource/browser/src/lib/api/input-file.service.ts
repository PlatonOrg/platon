import { inject, Injectable } from '@angular/core'
import { ResourceFileService } from './file.service'
import { lastValueFrom } from 'rxjs'
import { DialogService } from '@platon/core/browser'

const path = '/api/v1/files/'

class Info {
  lastSaveUrl: string
  currentUrl: string

  constructor(lastSaveUrl: string) {
    this.lastSaveUrl = lastSaveUrl
    this.currentUrl = lastSaveUrl
  }
}

/**
 * file service for upload file for the input-file
 */
@Injectable({ providedIn: 'root' })
export class InputFileService {
  private resourceId = ''
  private version = ''
  private isBuilder = false
  private displayMessage = false
  private files: Map<string, Info> = new Map()

  private readonly resourcefileService = inject(ResourceFileService) // to upload file, because Monaco.Uri doesn't work
  private readonly dialogService = inject(DialogService)

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
    } else {
      // this.openDialogue('Veuillez sauvegarder pour supprimer le fichier.')
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

  urlFile(InputValue: string): string {
    let reference = (InputValue.replace(/@copycontent|@copyurl/g, '') || '').trim() // current file
    if (reference === '') {
      return ''
    }
    reference = reference.replace('/', '')
    const [resourceId, versionAndName] = reference.split(':') // resource id, latest/file name
    const uri = path + resourceId + '/' + versionAndName.split('/')[1] + '?download&version=' + this.version // uri for display and donwload
    return uri
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
}
