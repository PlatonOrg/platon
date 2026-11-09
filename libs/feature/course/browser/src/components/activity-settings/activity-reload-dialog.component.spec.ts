/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { ActivityReloadExercise, ActivityReloadPreview } from '@platon/feature/course/common'
import { ActivityReloadDialogComponent } from './activity-reload-dialog.component'

describe('ActivityReloadDialogComponent', () => {
  let fixture: ComponentFixture<ActivityReloadDialogComponent>
  let component: any
  let close: jest.Mock

  const exercise = (key: string, status: ActivityReloadExercise['status'], extra = {}): ActivityReloadExercise => ({
    key,
    title: key,
    status,
    startedCount: 3,
    changedVariables: status === 'modified' ? ['statement'] : [],
    risks: [],
    ...extra,
  })

  const preview: ActivityReloadPreview = {
    fullReset: false,
    exercises: [
      exercise('a', 'unchanged'),
      exercise('b', 'modified'),
      exercise('c', 'modified', { risks: ['grader', 'files'] }),
    ],
  }

  beforeEach(async () => {
    close = jest.fn()
    await TestBed.configureTestingModule({
      imports: [ActivityReloadDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: preview },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(ActivityReloadDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('envoie les exercices modifiés en effaçant leurs copies par défaut', () => {
    expect(component.destroyedCount()).toEqual(6)
    expect(component.keptKeys()).toEqual([])
  })

  it('ne compte pas comme effacées les copies des exercices dont on garde les réponses', () => {
    component.choosing.set(true)
    component.toggleKept(preview.exercises[1], true)
    fixture.detectChanges()

    expect(component.destroyedCount()).toEqual(3)
    expect(fixture.nativeElement.textContent).toContain('Garder les réponses comporte des risques')
  })

  it('oublie la conservation des réponses quand un exercice est désélectionné', () => {
    component.toggleKept(preview.exercises[1], true)
    component.toggle(preview.exercises[1], false)

    expect(component.keptKeys()).toEqual([])
  })

  it('avertit quand le grader ou les fichiers ont changé', () => {
    component.choosing.set(true)
    component.toggleKept(preview.exercises[2], true)
    fixture.detectChanges()

    expect(component.describeRisks(preview.exercises[2])).toEqual('le grader et les fichiers inclus ont changé')
    expect(fixture.nativeElement.querySelector('.details .warning')).not.toBeNull()
  })
})
