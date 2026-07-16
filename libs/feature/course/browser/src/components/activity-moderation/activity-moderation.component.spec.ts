import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivityModerationComponent } from './activity-moderation.component'

describe('ActivityModerationComponent', () => {
  let fixture: ComponentFixture<ActivityModerationComponent>
  let component: ActivityModerationComponent

  const setCode = (code: string | undefined) => {
    fixture.componentRef.setInput('code', code)
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityModerationComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(ActivityModerationComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('results', [])
    fixture.detectChanges()
  })

  describe('code de déblocage', () => {
    it("n'affiche rien tant qu'aucun code n'est fourni (activité non graded)", () => {
      setCode(undefined)

      const el: HTMLElement = fixture.nativeElement
      expect(el.querySelector('.activity-code')).toBeNull()
    })

    it('masque le code par défaut (spoiler) quand un code est fourni', () => {
      setCode('ABC123')

      const el: HTMLElement = fixture.nativeElement
      const spoiler = el.querySelector('.code-spoiler')
      expect(spoiler).toBeTruthy()
      expect(spoiler?.textContent?.trim()).toBe('●●●●●●')
      expect(component['isCodeRevealed']).toBe(false)
    })

    it('révèle le vrai code au premier clic, le remasque au second', () => {
      setCode('ABC123')
      const el: HTMLElement = fixture.nativeElement
      const spoiler = el.querySelector('.code-spoiler') as HTMLElement

      spoiler.click()
      fixture.detectChanges()
      expect(component['isCodeRevealed']).toBe(true)
      expect(el.querySelector('.code-spoiler')?.textContent?.trim()).toBe('ABC123')

      spoiler.click()
      fixture.detectChanges()
      expect(component['isCodeRevealed']).toBe(false)
      expect(el.querySelector('.code-spoiler')?.textContent?.trim()).toBe('●●●●●●')
    })
  })
})
