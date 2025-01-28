import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RestrictionManagerComponent } from './restriction-manager.component'

describe('RestrictionManagerComponent', () => {
  let component: RestrictionManagerComponent
  let fixture: ComponentFixture<RestrictionManagerComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestrictionManagerComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(RestrictionManagerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
