import { ComponentFixture, TestBed } from '@angular/core/testing'
import { UserCharterComponent } from './user-charter.component'

describe('UserCharterComponent', () => {
  let component: UserCharterComponent
  let fixture: ComponentFixture<UserCharterComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCharterComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(UserCharterComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
