import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AnnouncementPreviewModalComponent } from './announcement-preview-modal.component'

describe('AnnouncementPreviewModalComponent', () => {
  let component: AnnouncementPreviewModalComponent
  let fixture: ComponentFixture<AnnouncementPreviewModalComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementPreviewModalComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(AnnouncementPreviewModalComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
