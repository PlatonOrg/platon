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

  it('garde les avertissements hors de la zone qui défile', () => {
    const summary = fixture.nativeElement.querySelector('.summary')

    expect(summary.textContent).toContain('Irréversible')
    expect(fixture.nativeElement.querySelector('mat-dialog-content').contains(summary)).toBe(false)
  })

  it('indique sur le bouton ce qui sera effacé', () => {
    const button = () => fixture.nativeElement.querySelector('button.danger')

    expect(button().textContent).toContain('Effacer 6 copies et recharger')

    component.choosing.set(true)
    component.toggleKept(preview.exercises[1], true)
    component.toggleKept(preview.exercises[2], true)
    fixture.detectChanges()

    expect(button()).toBeNull()
    expect(component.confirmLabel()).toEqual('Recharger la sélection (2)')
  })
})

describe('ActivityReloadDialogComponent, cas particuliers', () => {
  const create = (preview: ActivityReloadPreview) => {
    TestBed.configureTestingModule({
      imports: [ActivityReloadDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: preview },
        { provide: MatDialogRef, useValue: { close: jest.fn() } },
      ],
    })
    const fixture = TestBed.createComponent(ActivityReloadDialogComponent)
    fixture.detectChanges()
    return fixture
  }

  const modified = (key: string, risks: ActivityReloadExercise['risks'] = []): ActivityReloadExercise => ({
    key,
    title: key,
    status: 'modified',
    startedCount: 1,
    changedVariables: ['builder'],
    risks,
  })

  it('annonce un effacement complet en mode pairs', () => {
    const fixture = create({ fullReset: true, exercises: [modified('a')] })

    expect(fixture.nativeElement.querySelector('button.danger').textContent).toContain(
      'Effacer toutes les copies et recharger'
    )
  })

  it('ne présente pas comme destructif un rechargement sans changement', () => {
    const fixture = create({
      fullReset: false,
      exercises: [{ ...modified('a'), status: 'unchanged' }],
    })

    expect(fixture.nativeElement.querySelector('button.danger')).toBeNull()
  })

  it('évoque un modèle commun quand plusieurs builders ou graders ont changé', () => {
    const shared = create({ fullReset: false, exercises: [modified('a', ['builder']), modified('b', ['grader'])] })
    expect(shared.nativeElement.querySelector('.hint')).not.toBeNull()

    TestBed.resetTestingModule()
    const single = create({ fullReset: false, exercises: [modified('a', ['builder']), modified('b')] })
    expect(single.nativeElement.querySelector('.hint')).toBeNull()
  })
})
