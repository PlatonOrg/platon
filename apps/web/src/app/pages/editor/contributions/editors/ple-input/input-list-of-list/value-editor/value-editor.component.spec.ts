import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ValueEditorComponent } from './value-editor.component'

describe('ValueEditorComponent', () => {
  let component: ValueEditorComponent
  let fixture: ComponentFixture<ValueEditorComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValueEditorComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(ValueEditorComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
