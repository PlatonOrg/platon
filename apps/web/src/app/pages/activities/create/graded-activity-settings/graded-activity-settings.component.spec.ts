import { ComponentFixture, TestBed } from '@angular/core/testing'
import { GradedActivitySettingsComponent } from './graded-activity-settings.component'

describe('GradedActivitySettingsComponent', () => {
  let component: GradedActivitySettingsComponent
  let fixture: ComponentFixture<GradedActivitySettingsComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradedActivitySettingsComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(GradedActivitySettingsComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  describe('code', () => {
    it('génère un code de 6 caractères alphanumériques majuscules à la création', () => {
      expect(component.code()).toMatch(/^[A-Z0-9]{6}$/)
    })

    it('change de valeur à chaque régénération', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 20; i++) {
        component['regenerateCode']()
        codes.add(component.code())
      }
      // Très improbable que les 20 tirages retombent tous sur la même valeur.
      expect(codes.size).toBeGreaterThan(1)
      codes.forEach((code) => expect(code).toMatch(/^[A-Z0-9]{6}$/))
    })

    it('affiche le code généré dans le template', () => {
      const el: HTMLElement = fixture.nativeElement
      expect(el.querySelector('.generated-code')?.textContent?.trim()).toBe(component.code())
    })

    it('met à jour le DOM après un clic sur le bouton de régénération', () => {
      const el: HTMLElement = fixture.nativeElement
      const before = component.code()
      const button = el.querySelector('button') as HTMLButtonElement
      button.click()
      fixture.detectChanges()

      expect(el.querySelector('.generated-code')?.textContent?.trim()).toBe(component.code())
      // Le code affiché a bien été régénéré (extrêmement improbable qu'il soit identique par hasard).
      expect(component.code()).not.toBe(before)
    })
  })

  describe('settings', () => {
    it("n'inclut jamais le code de déblocage dans les paramètres d'activité envoyés au serveur", () => {
      expect(component.settings()).not.toHaveProperty('code')
    })

    it('calcule la durée totale en secondes à partir des heures/minutes/secondes', () => {
      component['durationHours'].set(1)
      component['durationMinutes'].set(2)
      component['durationSeconds'].set(3)

      expect(component.settings().duration).toBe(1 * 3600 + 2 * 60 + 3)
    })

    it('désactive systématiquement les aides, la solution, le reroll et les théories', () => {
      const { actions } = component.settings()
      expect(actions).toEqual(
        expect.objectContaining({
          hints: false,
          reroll: false,
          theories: false,
          solution: false,
        })
      )
    })

    it('reflète les tentatives maximales et les options de sécurité choisies', () => {
      component['maxAttempts'].set(3)
      component['noCopyPaste'].set(false)
      component['terminateOnLeavePage'].set(false)
      component['terminateOnLoseFocus'].set(true)

      const settings = component.settings()
      expect(settings.actions?.retry).toBe(3)
      expect(settings.security).toEqual({
        noCopyPaste: false,
        terminateOnLeavePage: false,
        terminateOnLoseFocus: true,
      })
    })
  })
})
