import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FeatureAnnouncementModalComponent } from './feature-announcement-modal.component'

describe('FeatureAnnouncementModalComponent', () => {
  let component: FeatureAnnouncementModalComponent
  let fixture: ComponentFixture<FeatureAnnouncementModalComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureAnnouncementModalComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(FeatureAnnouncementModalComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
