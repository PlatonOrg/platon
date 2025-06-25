import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AnnouncementEditDrawerComponent } from './announcement-edit-drawer.component'

describe('AnnouncementEditDrawerComponent', () => {
  let component: AnnouncementEditDrawerComponent
  let fixture: ComponentFixture<AnnouncementEditDrawerComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementEditDrawerComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(AnnouncementEditDrawerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
