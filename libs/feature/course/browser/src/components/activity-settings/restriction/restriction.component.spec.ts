import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RestrictionComponent } from './restriction.component'

describe('RestrictionComponent', () => {
  let component: RestrictionComponent
  let fixture: ComponentFixture<RestrictionComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestrictionComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(RestrictionComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
