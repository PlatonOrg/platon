import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ExercisePlayer } from '@platon/feature/player/common'
import { PlayerErrorComponent } from './player-error.component'

describe('PlayerErrorComponent', () => {
  let component: PlayerErrorComponent
  let fixture: ComponentFixture<PlayerErrorComponent>

  const mockPlayer: ExercisePlayer = {
    type: 'exercise',
    sessionId: 'session-test-id',
    form: '',
    title: 'Exercice test',
    statement: '',
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerErrorComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(PlayerErrorComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('player', mockPlayer)
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
