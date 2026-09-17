import { By } from '@angular/platform-browser'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FoldableFeedbackComponent } from './foldable-feedback.component'
import { FoldableFeedbackContent } from './foldable-feedback'

describe('FoldableFeedbackComponent', () => {
  let fixture: ComponentFixture<FoldableFeedbackComponent>
  let content: FoldableFeedbackContent[]

  beforeEach(async () => {
    content = [
      {
        name: 'Catégorie',
        description: '',
        expected: '',
        obtained: '',
        arguments: '',
        type: 'info',
        display: true,
        feedbacks: [
          {
            name: 'Sous-catégorie',
            description: '',
            expected: '',
            obtained: '',
            arguments: '',
            type: 'info',
            display: false,
            feedbacks: undefined,
          },
        ],
      },
    ]

    await TestBed.configureTestingModule({
      imports: [FoldableFeedbackComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(FoldableFeedbackComponent)
    fixture.componentInstance.state = {
      cid: '',
      selector: 'wc-foldable-feedback',
      debug: false,
      isFilled: false,
      content,
    }
    fixture.detectChanges()
  })

  function feedbackHeaders(): HTMLElement[] {
    return fixture.debugElement.queryAll(By.css('.feedback > h2')).map((debugEl) => debugEl.nativeElement)
  }

  it('ouvrir une sous-catégorie ne doit pas refermer sa catégorie parente', () => {
    feedbackHeaders()[1].click()
    fixture.detectChanges()

    expect(content[0].display).toBe(true)
    expect(content[0].feedbacks?.[0].display).toBe(true)
  })

  it('refermer une sous-catégorie ne doit pas refermer sa catégorie parente', () => {
    content[0].feedbacks![0].display = true
    fixture.detectChanges()

    feedbackHeaders()[1].click() // fermeture de la sous-catégorie
    fixture.detectChanges()

    expect(content[0].display).toBe(true)
    expect(content[0].feedbacks?.[0].display).toBe(false)
  })
})
