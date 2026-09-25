import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'

import { Activity, ActivityKind, Course, CourseSection } from '@platon/feature/course/common'
import { CourseService } from '@platon/feature/course/browser'
import { PlayerService } from '@platon/feature/player/browser'
import { ThemeService } from '@platon/core/browser'

import { CourseReaderPage } from './course-reader.page'

describe('CourseReaderPage', () => {
  let fixture: ComponentFixture<CourseReaderPage>
  let component: CourseReaderPage
  let courseService: { find: jest.Mock; listSections: jest.Mock; listActivities: jest.Mock }

  const course = { id: 'course-1', name: 'Cours de test' } as Course
  const section = { id: 'section-1', name: 'Section 1', order: 0 } as CourseSection

  const lesson = {
    id: 'lesson-1',
    sectionId: 'section-1',
    order: 0,
    kind: ActivityKind.LESSON,
    progression: 0,
  } as Activity
  const practiceExercise = {
    id: 'exercise-practice',
    sectionId: 'section-1',
    order: 1,
    kind: ActivityKind.EXERCISE,
    progression: 0,
  } as Activity
  const gradedExercise = {
    id: 'exercise-graded',
    sectionId: 'section-1',
    order: 2,
    kind: ActivityKind.EXERCISE,
    progression: 0,
    state: 'opened',
    activitySettings: { security: { terminateOnLeavePage: true, terminateOnLoseFocus: true } },
  } as Activity

  beforeEach(async () => {
    courseService = {
      find: jest.fn().mockReturnValue(of(course)),
      listSections: jest.fn().mockReturnValue(of({ resources: [section], total: 1 })),
      listActivities: jest
        .fn()
        .mockReturnValue(of({ resources: [lesson, practiceExercise, gradedExercise], total: 3 })),
    }

    await TestBed.configureTestingModule({
      imports: [CourseReaderPage],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: PlayerService, useValue: { playActivity: jest.fn() } },
        { provide: ThemeService, useValue: { switchTheme: jest.fn(), themeIcon: 'sun' } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'courseId' ? course.id : null) },
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(CourseReaderPage)
    component = fixture.componentInstance
    // On appelle ngOnInit directement (sans detectChanges) pour ne pas avoir à mocker toute la
    // chaîne de composants imbriqués du template (player-wrapper, editorjs-viewer...) : seule la
    // logique de chargement/filtrage nous intéresse ici.
    await component.ngOnInit()
  })

  it('exclut les TP notés du parcours séquentiel mais garde les exercices non surveillés', () => {
    const ids = component['items']().map((item) => item.activity.id)

    expect(ids).toEqual([lesson.id, practiceExercise.id])
  })

  it('range les TP notés dans gradedActivities, à part du parcours', () => {
    const ids = component['gradedActivities']().map((item) => item.activity.id)

    expect(ids).toEqual([gradedExercise.id])
  })
})
