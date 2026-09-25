import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { Activity, ActivityKind, Course, CourseSection } from '@platon/feature/course/common'
import { CourseStudentOverviewComponent } from './course-student-overview.component'

describe('CourseStudentOverviewComponent', () => {
  let fixture: ComponentFixture<CourseStudentOverviewComponent>
  let component: CourseStudentOverviewComponent

  const sectionA = { id: 'section-a', order: 0, name: 'Section A' } as CourseSection
  const sectionB = { id: 'section-b', order: 1, name: 'Section B' } as CourseSection

  const lesson = {
    id: 'lesson-1',
    sectionId: 'section-a',
    order: 0,
    kind: ActivityKind.LESSON,
    title: 'Leçon 1',
    progression: 100,
    state: 'opened',
  } as Activity

  const practiceExercise = {
    id: 'exercise-practice',
    sectionId: 'section-a',
    order: 1,
    kind: ActivityKind.EXERCISE,
    title: 'Exercice guidé',
    progression: 0,
    state: 'opened',
  } as Activity

  const halfSecuredExercise = {
    id: 'exercise-half',
    sectionId: 'section-b',
    order: 1,
    kind: ActivityKind.EXERCISE,
    title: 'Exercice presque sécurisé',
    progression: 0,
    state: 'opened',
    activitySettings: { security: { terminateOnLeavePage: true, terminateOnLoseFocus: false } },
  } as Activity

  const gradedExercise = {
    id: 'exercise-graded',
    sectionId: 'section-b',
    order: 0,
    kind: ActivityKind.EXERCISE,
    title: 'TP noté',
    progression: 0,
    state: 'opened',
    activitySettings: {
      duration: 3600,
      actions: { retry: 2 },
      security: { terminateOnLeavePage: true, terminateOnLoseFocus: true },
    },
  } as Activity

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseStudentOverviewComponent, RouterTestingModule],
    }).compileComponents()

    fixture = TestBed.createComponent(CourseStudentOverviewComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('course', { id: 'course-1', name: 'Mon cours' } as Course)
    fixture.componentRef.setInput('sections', [sectionB, sectionA])
    fixture.componentRef.setInput('activities', [gradedExercise, lesson, halfSecuredExercise, practiceExercise])
    fixture.detectChanges()
  })

  it('exclut les TP notés de la table des matières mais garde les exercices non surveillés', () => {
    const flattened = component['sectionItems']().flatMap((item) => item.activities.map((activity) => activity.id))

    expect(flattened).toEqual([lesson.id, practiceExercise.id, halfSecuredExercise.id])
  })

  it('ne considère un exercice comme TP noté que si les deux flags de sécurité sont actifs (détail du calcul dans graded-activities.util.spec.ts)', () => {
    const gradedIds = component['gradedActivities']().map((item) => item.activity.id)

    expect(gradedIds).toEqual([gradedExercise.id])
    expect(component['gradedActivities']()[0].duration).toBe(3600)
  })

  it('ignore les TP notés pour déterminer la première activité incomplète', () => {
    fixture.componentRef.setInput('activities', [gradedExercise, practiceExercise])
    fixture.detectChanges()

    expect(component['firstIncompleteActivityId']()).toBe(practiceExercise.id)
  })
})
