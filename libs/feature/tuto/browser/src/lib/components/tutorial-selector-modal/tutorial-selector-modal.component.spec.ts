import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TutorialSelectorModalComponent } from './tutorial-selector-modal.component'

describe('TutorialSelectorModalComponent', () => {
  let component: TutorialSelectorModalComponent
  let fixture: ComponentFixture<TutorialSelectorModalComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorialSelectorModalComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(TutorialSelectorModalComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
