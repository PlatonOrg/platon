import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ValueEditorComponent } from './value-editor.component'
import { VALUE_EDITOR_TOKEN } from '../../ple-input'
import { NO_ERRORS_SCHEMA } from '@angular/core'

describe('ValueEditorComponent', () => {
  let component: ValueEditorComponent
  let fixture: ComponentFixture<ValueEditorComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValueEditorComponent],
      providers: [
        {
          provide: VALUE_EDITOR_TOKEN,
          useValue: jest.fn(),
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()

    fixture = TestBed.createComponent(ValueEditorComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
