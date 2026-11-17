import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { AuthService } from '@platon/core/browser'
import { of } from 'rxjs'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { WebComponentService } from '../../web-component.service'
import { FileUploadState } from './file-upload'
import { FileUploadComponent } from './file-upload.component'
import { FileUploadService } from './file-upload.service'

// Le barrel de @platon/core/browser charge aussi l'éditeur Ace, que Jest ne sait pas importer :
// seul le jeton d'injection AuthService est utile ici.
jest.mock('@platon/core/browser', () => ({ AuthService: class AuthService {} }))

/** `wc-base` (éditeur de l'état en mode debug) n'est pas utile ici et dépend de Monaco. */
@Component({ selector: 'wc-base', template: '' })
class BaseStubComponent {
  @Input() state: unknown
  @Output() stateChange = new EventEmitter<unknown>()
}

describe('FileUploadComponent', () => {
  let fixture: ComponentFixture<FileUploadComponent>
  let uploads: FileUploadService

  /** `user` peut être une promesse, pour simuler la vérification de la connexion en cours. */
  async function setup(user: { id: string } | undefined | Promise<{ id: string } | undefined>) {
    await TestBed.configureTestingModule({
      imports: [FileUploadComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: { ready: () => Promise.resolve(user) } },
        {
          provide: FileUploadService,
          useValue: {
            getExistingSubmissions: jest.fn(() => of({ submissions: [], total: 0 })),
            uploadFile: jest.fn(() => of()),
          },
        },
      ],
    })
      .overrideComponent(FileUploadComponent, {
        set: {
          imports: [
            CommonModule,
            MatButtonModule,
            MatIconModule,
            MatProgressBarModule,
            CssPipeModule,
            BaseStubComponent,
          ],
        },
      })
      .compileComponents()
    jest.spyOn(TestBed.inject(WebComponentService), 'getContext').mockReturnValue({ sessionId: 'session' })
    uploads = TestBed.inject(FileUploadService)
    fixture = TestBed.createComponent(FileUploadComponent)
    fixture.componentInstance.state = {} as FileUploadState
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  afterEach(() => jest.restoreAllMocks())

  const button = () => fixture.nativeElement.querySelector('.select-button') as HTMLButtonElement
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? ''

  /** Dépose un fichier dans la zone, comme le ferait l'apprenant. */
  async function drop(name: string) {
    const files = [new File(['a\nb\nc'], name, { type: 'text/plain' })] as unknown as FileList
    const event = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: { files },
    } as unknown as DragEvent
    await fixture.componentInstance.onDrop(event)
    fixture.detectChanges()
  }

  describe('visiteur non connecté', () => {
    beforeEach(() => setup(undefined))

    it("désactive la zone de dépôt et dit qu'il faut se connecter, avant tout dépôt", () => {
      expect(button().disabled).toBe(true)
      expect(fixture.nativeElement.querySelector('.upload-zone').classList).toContain('disabled')
      expect(text()).toContain('Connectez-vous à PLaTon pour déposer un fichier.')
    })

    it("n'envoie aucune requête au serveur, qui répondrait 401", async () => {
      await drop('notes.txt')
      expect(uploads.getExistingSubmissions).not.toHaveBeenCalled()
      expect(uploads.uploadFile).not.toHaveBeenCalled()
      expect(fixture.componentInstance.state.uploadedFiles).toEqual([])
    })
  })

  describe('vérification de la connexion en cours', () => {
    let signIn: (user: { id: string }) => void
    beforeEach(() => setup(new Promise((resolve) => (signIn = resolve))))

    it("désactive la zone de dépôt sans demander de se connecter, puis l'active une fois connecté", async () => {
      expect(button().disabled).toBe(true)
      expect(text()).not.toContain('Connectez-vous')

      signIn({ id: 'user' })
      // La promesse en attente n'est pas suivie par whenStable : on laisse la vérification finir.
      await new Promise((resolve) => setTimeout(resolve))
      fixture.detectChanges()
      expect(button().disabled).toBe(false)
    })

    it("n'envoie pas de fichier déposé avant la fin de la vérification", async () => {
      await drop('notes.txt')
      expect(uploads.uploadFile).not.toHaveBeenCalled()
      expect(fixture.componentInstance.state.uploadedFiles).toEqual([])
    })
  })

  describe('utilisateur connecté', () => {
    beforeEach(() => setup({ id: 'user' }))

    it('laisse la zone de dépôt active et charge les fichiers déjà déposés', () => {
      expect(button().disabled).toBe(false)
      expect(text()).not.toContain('Connectez-vous')
      expect(uploads.getExistingSubmissions).toHaveBeenCalledWith('session')
    })

    it('envoie le fichier déposé', async () => {
      await drop('notes.txt')
      expect(uploads.uploadFile).toHaveBeenCalledWith(expect.any(File), 'session')
    })
  })
})
