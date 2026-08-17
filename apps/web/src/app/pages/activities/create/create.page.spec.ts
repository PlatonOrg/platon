/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { ActivatedRoute, Router } from '@angular/router'
import { NzIconTestModule } from 'ng-zorro-antd/icon/testing'
import { of } from 'rxjs'

import { AuthService, DialogService, TagService } from '@platon/core/browser'
import { CourseService } from '@platon/feature/course/browser'
import { ResourceService } from '@platon/feature/resource/browser'

import { ActivityCreatePage } from './create.page'
import { GradedActivitySettingsComponent } from './graded-activity-settings/graded-activity-settings.component'

const course = { id: 'course-id', name: 'Cours de test', ownerId: 'teacher-id', isTest: false } as any
const section = { id: 'section-id', name: 'Section de test', order: 0, courseId: 'course-id' } as any
const resource = { id: 'resource-id', name: 'Ressource de test', topics: [], levels: [] } as any

describe('ActivityCreatePage', () => {
  let fixture: ComponentFixture<ActivityCreatePage>
  let component: ActivityCreatePage
  let courseService: {
    find: jest.Mock
    findSection: jest.Mock
    createActivities: jest.Mock
    updateActivity: jest.Mock
    updateActivityCorrectors: jest.Mock
    searchMembers: jest.Mock
    listGroups: jest.Mock
  }
  let router: { navigateByUrl: jest.Mock }

  const createdActivity = (overrides: Record<string, unknown> = {}) => ({
    id: 'activity-id',
    courseId: 'course-id',
    activitySettings: {},
    ...overrides,
  })

  beforeEach(async () => {
    courseService = {
      find: jest.fn().mockReturnValue(of(course)),
      findSection: jest.fn().mockReturnValue(of(section)),
      createActivities: jest.fn().mockReturnValue(of({ resources: [createdActivity()], total: 1 })),
      updateActivity: jest.fn().mockReturnValue(of(createdActivity())),
      updateActivityCorrectors: jest.fn().mockReturnValue(of(undefined)),
      searchMembers: jest.fn().mockReturnValue(of({ resources: [], total: 0 })),
      listGroups: jest.fn().mockReturnValue(of({ resources: [], total: 0 })),
    }
    router = { navigateByUrl: jest.fn().mockResolvedValue(true) }

    await TestBed.configureTestingModule({
      imports: [ActivityCreatePage, NzIconTestModule],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: { ready: jest.fn().mockResolvedValue({ id: 'teacher-id' }) } },
        { provide: CourseService, useValue: courseService },
        { provide: DialogService, useValue: { error: jest.fn(), info: jest.fn(), warning: jest.fn() } },
        {
          provide: TagService,
          useValue: { listTopics: jest.fn().mockReturnValue(of([])), listLevels: jest.fn().mockReturnValue(of([])) },
        },
        {
          provide: ResourceService,
          useValue: {
            tree: jest.fn().mockReturnValue(of(undefined)),
            completion: jest.fn().mockReturnValue(of({ names: [], topics: [], levels: [] })),
            listOwners: jest.fn().mockReturnValue(of([])),
            search: jest.fn().mockReturnValue(of({ resources: [], total: 0 })),
          },
        },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'course' ? course.id : key === 'section' ? section.id : null),
              },
            },
          },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(ActivityCreatePage)
    component = fixture.componentInstance
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    component['resourceInfo'].patchValue({ resources: [resource] })
  })

  const goToConfigurationStep = () => {
    const stepper = component['stepper']
    // On avance pas à pas jusqu'à l'étape "Configuration" plutôt que de supposer un index fixe :
    // hasFirstStep bascule de façon asynchrone (après plusieurs `await` dans ngOnInit), donc le
    // nombre d'étapes projetées au moment du test n'est pas garanti tant qu'on n'a pas stabilisé.
    for (let i = 0; i < 10 && stepper['activeStep']?.stepTitle !== 'Configuration'; i++) {
      stepper.nextStep()
      fixture.detectChanges()
    }
    expect(stepper['activeStep']?.stepTitle).toBe('Configuration')
  }

  it('envoie le code et les paramètres graded uniquement pour une activité TP noté / Examen', async () => {
    goToConfigurationStep()
    component['selectActivityFunction']('graded')
    fixture.detectChanges()

    const gradedSettings = component['gradedSettings']()
    expect(gradedSettings).toBeTruthy()

    const expectedCode = gradedSettings!.code()

    await component['create']()

    expect(courseService.updateActivity).toHaveBeenCalledTimes(1)
    const [, payload] = courseService.updateActivity.mock.calls[0]
    expect(payload.code).toBe(expectedCode)
    expect(payload.code).toMatch(/^[A-Z0-9]{6}$/)
    expect(payload.activitySettings).toEqual(expect.objectContaining(gradedSettings!.settings()))
  })

  it("n'envoie ni code ni updateActivity pour une activité d'entraînement", async () => {
    goToConfigurationStep()
    component['selectActivityFunction']('training')
    fixture.detectChanges()

    await component['create']()

    expect(courseService.updateActivity).not.toHaveBeenCalled()
  })

  it("n'envoie ni code ni updateActivity pour un challenge", async () => {
    goToConfigurationStep()
    component['selectActivityFunction']('challenge')
    fixture.detectChanges()

    await component['create']()

    expect(courseService.updateActivity).not.toHaveBeenCalled()
  })

  it('affiche le code réellement rendu par le composant enfant dans le DOM', async () => {
    goToConfigurationStep()
    component['selectActivityFunction']('graded')
    fixture.detectChanges()

    const gradedComponent = fixture.debugElement.query(
      (de) => de.componentInstance instanceof GradedActivitySettingsComponent
    )
    expect(gradedComponent).toBeTruthy()

    const displayedCode = (fixture.nativeElement as HTMLElement).querySelector('.generated-code')?.textContent?.trim()
    expect(displayedCode).toBe(component['gradedSettings']()!.code())
  })
})
