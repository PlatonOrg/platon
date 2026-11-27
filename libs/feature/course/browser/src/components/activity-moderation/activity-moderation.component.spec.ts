import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { UserService } from '@platon/core/browser'
import { of } from 'rxjs'
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
      providers: [provideNoopAnimations(), { provide: UserService, useValue: { findByIdOrName: () => of(undefined) } }],
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

  describe('recherche', () => {
    it('reste disponible même pour une activité sans code de déblocage (pas de TP noté)', () => {
      setCode(undefined)

      const el: HTMLElement = fixture.nativeElement
      expect(el.querySelector('.search-field input')).toBeTruthy()
    })

    it("se met à jour tant qu'on ne tape rien, quand results change (rafraîchissement live)", () => {
      const userA = { id: 'a', firstName: 'Alice', lastName: 'Martin', activitySessionId: 'session-a' } as any
      const userB = { id: 'b', firstName: 'Bob', lastName: 'Durand', activitySessionId: 'session-b' } as any

      fixture.componentRef.setInput('results', [userA])
      fixture.detectChanges()
      expect(component['filteredUsers']()).toEqual([userA])

      // Simule un rafraîchissement live (nouvelle réponse d'un étudiant) sans que le prof ait tapé dans la recherche.
      fixture.componentRef.setInput('results', [userA, userB])
      fixture.detectChanges()
      expect(component['filteredUsers']()).toEqual([userA, userB])
    })

    it('filtre les étudiants par nom ou prénom', () => {
      const userA = { id: 'a', firstName: 'Alice', lastName: 'Martin', activitySessionId: 'session-a' } as any
      const userB = { id: 'b', firstName: 'Bob', lastName: 'Durand', activitySessionId: 'session-b' } as any
      fixture.componentRef.setInput('results', [userA, userB])
      fixture.detectChanges()

      component['searchForm'].setValue('ali')
      fixture.detectChanges()

      expect(component['filteredUsers']()).toEqual([userA])
    })
  })
})
