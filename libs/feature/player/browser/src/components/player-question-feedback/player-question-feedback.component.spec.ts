import { ComponentFixture, TestBed } from '@angular/core/testing'
import { PlayerQuestionFeedbackComponent } from './player-question-feedback.component'

describe('PlayerQuestionFeedbackComponent', () => {
  let component: PlayerQuestionFeedbackComponent
  let fixture: ComponentFixture<PlayerQuestionFeedbackComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerQuestionFeedbackComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(PlayerQuestionFeedbackComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
