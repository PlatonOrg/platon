import { ComponentFixture, TestBed } from '@angular/core/testing'
import { UserCharterComponent } from './user-charter.component'
import { UserService } from '@platon/core/browser'
import { of } from 'rxjs'

describe('UserCharterComponent', () => {
  let component: UserCharterComponent
  let fixture: ComponentFixture<UserCharterComponent>

  beforeEach(async () => {
    const mockUserService = {
      acceptUserCharter: jest.fn().mockReturnValue(of({ id: '1', acceptedUserCharter: true })),
      findUserCharterById: jest.fn().mockReturnValue(of({ id: '1', acceptedUserCharter: false })),
      findByIdOrName: jest.fn().mockReturnValue(of({})),
      search: jest.fn().mockReturnValue(of([])),
      findAllByUserNames: jest.fn().mockReturnValue(of([])),
      update: jest.fn(),
      searchUserGroups: jest.fn().mockReturnValue(of([])),
      createUserGroup: jest.fn(),
      updateUserGroup: jest.fn(),
      deleteUserGroup: jest.fn(),
      findUserPrefs: jest.fn().mockReturnValue(of({})),
      updateUserPrefs: jest.fn(),
    }

    await TestBed.configureTestingModule({
      imports: [UserCharterComponent],
    })
      .overrideComponent(UserCharterComponent, {
        set: {
          providers: [{ provide: UserService, useValue: mockUserService }],
        },
      })
      .compileComponents()

    fixture = TestBed.createComponent(UserCharterComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
