import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AnnouncementCreateDrawerComponent } from './announcement-create-drawer.component'

describe('AnnouncementCreateDrawerComponent', () => {
  let component: AnnouncementCreateDrawerComponent
  let fixture: ComponentFixture<AnnouncementCreateDrawerComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementCreateDrawerComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(AnnouncementCreateDrawerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
