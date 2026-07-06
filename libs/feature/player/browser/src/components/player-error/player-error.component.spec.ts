import { ComponentFixture, TestBed } from '@angular/core/testing'
import { PlayerErrorComponent } from './player-error.component'

describe('PlayerErrorComponent', () => {
  let component: PlayerErrorComponent
  let fixture: ComponentFixture<PlayerErrorComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerErrorComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(PlayerErrorComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
