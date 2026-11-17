import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { NzPopoverModule } from 'ng-zorro-antd/popover'
import { CssPipeModule } from '../../shared/pipes/css.pipe'
import { WebComponentService } from '../../web-component.service'
import { InputBoxState } from './input-box'
import { InputBoxComponent } from './input-box.component'

/** `wc-base` (éditeur de l'état en mode debug) n'est pas utile ici et dépend de Monaco. */
@Component({ selector: 'wc-base', template: '' })
class BaseStubComponent {
  @Input() state: unknown
  @Output() stateChange = new EventEmitter<unknown>()
}

describe('InputBoxComponent', () => {
  let fixture: ComponentFixture<InputBoxComponent>
  let submit: jest.SpyInstance

  async function setup(state: Partial<InputBoxState> = {}) {
    await TestBed.configureTestingModule({
      imports: [InputBoxComponent],
      providers: [provideNoopAnimations()],
    })
      .overrideComponent(InputBoxComponent, {
        set: {
          imports: [
            CommonModule,
            ReactiveFormsModule,
            MatInputModule,
            MatFormFieldModule,
            MatAutocompleteModule,
            MatIconModule,
            CssPipeModule,
            NzPopoverModule,
            BaseStubComponent,
          ],
        },
      })
      .compileComponents()
    submit = jest.spyOn(TestBed.inject(WebComponentService), 'submit').mockImplementation(() => undefined)
    fixture = TestBed.createComponent(InputBoxComponent)
    // Le setter du web component ne remplace que les propriétés données : les autres gardent leur valeur par défaut.
    fixture.componentInstance.state = state as InputBoxState
    fixture.detectChanges()
    await fixture.whenStable()
  }

  afterEach(() => jest.restoreAllMocks())

  const state = () => fixture.componentInstance.state
  const input = () => fixture.nativeElement.querySelector('input, textarea') as HTMLInputElement

  function type(value: string) {
    input().value = value
    input().dispatchEvent(new Event('input'))
  }

  it.each(['fill', 'inline'] as const)("écrit la saisie dans l'état sans délai (apparence %s)", async (appearance) => {
    await setup({ type: 'text', appearance })
    type('Paris')
    // Le player lit l'état au moment du clic sur « Valider » : la valeur doit y être tout de suite.
    expect(state().value).toBe('Paris')
    expect(state().isFilled).toBe(true)
  })

  it('convertit tout de suite un nombre écrit avec une virgule', async () => {
    await setup({ type: 'number' })
    type('3,5')
    expect(state().value).toBe(3.5)
  })

  it('soumet avec Entrée la valeur qui vient d’être saisie', async () => {
    await setup({ type: 'number', autoValidation: true })
    let submitted: unknown
    submit.mockImplementation(() => (submitted = state().value))

    type('192')
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(submit).toHaveBeenCalledTimes(1)
    expect(submitted).toBe(192)
  })

  it('ne soumet pas avec Entrée sans validation automatique', async () => {
    await setup({ type: 'text' })
    type('Paris')
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(submit).not.toHaveBeenCalled()
  })
})
