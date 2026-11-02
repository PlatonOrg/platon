/**
 * Tests de non-régression : navigation et progression du lecteur de cours PlatonClass
 * (branche feature/open-class). Même montage que course-reader.page.spec.ts.
 * `it.failing` = défaut relevé par l'audit (AUD-xx), à passer en `it` une fois corrigé.
 */
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of, throwError } from 'rxjs'

import { ThemeService } from '@platon/core/browser'
import { CourseService } from '@platon/feature/course/browser'
import { Activity, ActivityKind, Course, CourseSection } from '@platon/feature/course/common'
import { PlayerService } from '@platon/feature/player/browser'

import { CourseReaderPage } from './course-reader.page'

type Reader = {
  ngOnInit(): Promise<void>
  next(): Promise<void>
  previous(): void
  markCurrentLessonCompleted(): Promise<void>
  currentIndex(): number
  items(): { activity: Activity }[]
}

describe('CourseReaderPage (non-régression)', () => {
  const course = { id: 'course-1', name: 'Cours' } as Course
  const section = { id: 'section-1', name: 'Section 1', order: 0 } as CourseSection
  const lesson = (id: string, order: number, progression = 0) =>
    ({ id, sectionId: section.id, order, kind: ActivityKind.LESSON, progression }) as Activity
  const exercise = (id: string, order: number, progression = 0) =>
    ({ id, sectionId: section.id, order, kind: ActivityKind.EXERCISE, progression }) as Activity

  let courseService: {
    find: jest.Mock
    listSections: jest.Mock
    listActivities: jest.Mock
    markLessonCompleted: jest.Mock
  }
  let router: { navigate: jest.Mock }

  const setup = async (activities: Activity[], requestedItem: string | null = null): Promise<Reader> => {
    courseService = {
      find: jest.fn().mockReturnValue(of(course)),
      listSections: jest.fn().mockReturnValue(of({ resources: [section], total: 1 })),
      listActivities: jest.fn().mockReturnValue(of({ resources: activities, total: activities.length })),
      markLessonCompleted: jest.fn().mockReturnValue(of(undefined)),
    }
    router = { navigate: jest.fn().mockResolvedValue(true) }

    await TestBed.configureTestingModule({
      imports: [CourseReaderPage],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: PlayerService, useValue: { playActivity: jest.fn() } },
        { provide: ThemeService, useValue: { switchTheme: jest.fn(), themeIcon: 'sun' } },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'courseId' ? course.id : null) },
              queryParamMap: { get: (key: string) => (key === 'item' ? requestedItem : null) },
            },
          },
        },
      ],
    }).compileComponents()

    const reader = TestBed.createComponent(CourseReaderPage).componentInstance as unknown as Reader
    await reader.ngOnInit()
    return reader
  }

  afterEach(() => TestBed.resetTestingModule())

  it('ouvre le cours sur le premier élément non terminé', async () => {
    const reader = await setup([lesson('l-1', 0, 100), lesson('l-2', 1), lesson('l-3', 2)])

    expect(reader.currentIndex()).toBe(1)
  })

  it('respecte ?item= (lien direct vers un chapitre)', async () => {
    const reader = await setup([lesson('l-1', 0), lesson('l-2', 1), lesson('l-3', 2)], 'l-3')

    expect(reader.currentIndex()).toBe(2)
  })

  it('ignore un ?item= inconnu', async () => {
    const reader = await setup([lesson('l-1', 0, 100), lesson('l-2', 1)], 'inconnu')

    expect(reader.currentIndex()).toBe(1)
  })

  it('suivant : marque la leçon terminée une fois, avance d’un cran et met à jour la progression', async () => {
    const reader = await setup([lesson('l-1', 0), lesson('l-2', 1)])

    await reader.next()

    expect(courseService.markLessonCompleted).toHaveBeenCalledTimes(1)
    expect(courseService.markLessonCompleted).toHaveBeenCalledWith(expect.objectContaining({ id: 'l-1' }))
    expect(reader.currentIndex()).toBe(1)
    expect(reader.items()[0].activity.progression).toBe(100)
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { item: 'l-2' } }))
  })

  it("suivant sur une leçon déjà terminée ou sur un exercice : pas d'appel à l'API", async () => {
    const reader = await setup([lesson('l-1', 0, 100), exercise('e-1', 1), lesson('l-2', 2)], 'l-1')

    await reader.next()
    await reader.next()

    expect(courseService.markLessonCompleted).not.toHaveBeenCalled()
    expect(reader.currentIndex()).toBe(2)
  })

  it('précédent au début et suivant à la fin ne sortent pas du parcours', async () => {
    const reader = await setup([lesson('l-1', 0, 100), lesson('l-2', 1, 100)], 'l-1')

    reader.previous()
    expect(reader.currentIndex()).toBe(0)

    await reader.next()
    await reader.next()
    expect(reader.currentIndex()).toBe(1)
  })

  it('le dernier chapitre peut être marqué terminé sans bouton suivant', async () => {
    const reader = await setup([lesson('l-1', 0, 100), lesson('l-2', 1)], 'l-2')

    await reader.markCurrentLessonCompleted()

    expect(courseService.markLessonCompleted).toHaveBeenCalledTimes(1)
    expect(reader.items()[1].activity.progression).toBe(100)
  })

  // AUD-10 : deux clics rapides sur « Chapitre suivant » passent tous deux le test
  // progression < 100 avant la réponse : deux POST, puis deux +1 : un chapitre est sauté.
  it.failing('AUD-10 un double clic sur suivant n’avance que d’un chapitre', async () => {
    const reader = await setup([lesson('l-1', 0), lesson('l-2', 1), lesson('l-3', 2)])

    await Promise.all([reader.next(), reader.next()])

    expect(reader.currentIndex()).toBe(1)
    expect(courseService.markLessonCompleted).toHaveBeenCalledTimes(1)
  })

  // AUD-11 : si l'enregistrement de la progression échoue (réseau, 403...), next() rejette sans
  // traitement : l'étudiant reste bloqué sur le chapitre, sans message.
  it.failing('AUD-11 un échec d’enregistrement ne bloque pas la navigation', async () => {
    const reader = await setup([lesson('l-1', 0), lesson('l-2', 1)])
    courseService.markLessonCompleted.mockReturnValue(throwError(() => new Error('réseau')))

    await expect(reader.next()).resolves.toBeUndefined()
    expect(reader.currentIndex()).toBe(1)
  })
})
