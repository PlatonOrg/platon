import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'

import { Resource, ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'
import { ActivityCardComponent } from './activity-card.component'

const RESOURCE: Resource = {
  id: 'resource-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  name: 'Activité de test',
  type: ResourceTypes.ACTIVITY,
  personal: false,
  status: ResourceStatus.READY,
  levels: [],
  topics: [],
  ownerId: 'owner-1',
}

describe('ActivityCardComponent', () => {
  let component: ActivityCardComponent
  let fixture: ComponentFixture<ActivityCardComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityCardComponent, RouterTestingModule],
    }).compileComponents()

    fixture = TestBed.createComponent(ActivityCardComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('item', RESOURCE)
    fixture.detectChanges()
  })

  describe('previewUrl', () => {
    it('inclut toujours "version=latest", sans quoi le backend répond 400 (voir PreviewInputDTO.version)', () => {
      expect(component.previewUrl).toContain('?version=latest')
    })

    it("pointe vers la route de prévisualisation de l'activité affichée", () => {
      expect(component.previewUrl).toBe(`/player/preview/${RESOURCE.id}?version=latest`)
    })
  })

  describe('openTab', () => {
    it("ouvre l'URL de prévisualisation dans un nouvel onglet au clic sur l'action de prévisualisation", () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

      const previewAction = fixture.nativeElement.querySelectorAll('.action')[1] as HTMLElement
      previewAction.click()

      expect(openSpy).toHaveBeenCalledWith(component.previewUrl, '_blank')
      openSpy.mockRestore()
    })
  })
})
