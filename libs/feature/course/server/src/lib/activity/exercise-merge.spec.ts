import { PLSourceFile, Variables } from '@platon/feature/compiler'
import {
  changedExerciseVariables,
  exerciseReloadRisks,
  mergeExerciseSourceVariables,
  mergeExerciseVariables,
} from './exercise-merge'

const source = (variables: Variables, hash = 'h1'): PLSourceFile =>
  ({
    resource: 'r',
    version: 'latest',
    abspath: 'r:latest/main.ple',
    dependencies: [{ alias: 'f', abspath: 'x', content: '', hash, lineno: 1 }],
    variables,
  } as unknown as PLSourceFile)

describe('changedExerciseVariables', () => {
  it('liste les variables modifiées, ajoutées ou retirées sans tenir compte de la graine ni des cid', () => {
    expect(
      changedExerciseVariables(
        { title: 'A', statement: 'x', old: 1, seed: 1, c: { cid: '1', selector: 'wc-a', v: 1 } },
        { title: 'A', statement: 'y', added: 2, seed: 2, c: { cid: '2', selector: 'wc-a', v: 1 } }
      )
    ).toEqual(['added', 'old', 'statement'])
  })
})

describe('exerciseReloadRisks', () => {
  it('signale une modification du builder, du grader ou des fichiers', () => {
    const previous = source({ statement: 'x', builder: 'a', grader: 'a' })
    expect(exerciseReloadRisks(previous, source({ statement: 'y', builder: 'a', grader: 'a' }))).toEqual([])
    expect(exerciseReloadRisks(previous, source({ statement: 'x', builder: 'b', grader: 'b' }, 'h2'))).toEqual([
      'builder',
      'grader',
      'files',
    ])
  })
})

describe('mergeExerciseVariables', () => {
  const base = { title: 'Tirte', statement: 'Calculer {{ a }}', a: 0, c: { cid: 'old', selector: 'wc-a', value: '' } }

  it("remplace les variables que la session n'a pas modifiées", () => {
    const current = { ...base, a: 42, '.meta': { attempts: 1 } }
    const result = mergeExerciseVariables('unmodified', {
      keys: ['title', 'statement'],
      base,
      next: { ...base, title: 'Titre', statement: 'Calculez {{ a }}' },
      current,
    })
    expect(result.variables).toEqual({ ...current, title: 'Titre', statement: 'Calculez {{ a }}' })
    expect(result.updated).toEqual(['title', 'statement'])
    expect(result.skipped).toEqual([])
  })

  it('garde les variables calculées par le builder ou modifiées par la réponse', () => {
    const current = { ...base, statement: 'Calculer 42', c: { cid: 'old', selector: 'wc-a', value: 'réponse' } }
    const result = mergeExerciseVariables('unmodified', {
      keys: ['statement', 'c'],
      base,
      next: { ...base, statement: 'Calculez {{ a }}', c: { cid: 'new', selector: 'wc-a', value: '', size: 2 } },
      current,
    })
    expect(result.variables).toEqual(current)
    expect(result.skipped).toEqual(['statement', 'c'])
  })

  it('garde le cid du composant de la session et supprime les variables retirées', () => {
    const result = mergeExerciseVariables('unmodified', {
      keys: ['c', 'a'],
      base,
      next: { title: 'Tirte', statement: 'Calculer {{ a }}', c: { cid: 'new', selector: 'wc-a', value: '', size: 2 } },
      current: base,
    })
    expect(result.variables['c']).toEqual({ cid: 'old', selector: 'wc-a', value: '', size: 2 })
    expect('a' in result.variables).toBe(false)
  })
})

describe('mergeExerciseSourceVariables', () => {
  it('ne remplace que les variables modifiées', () => {
    expect(
      mergeExerciseSourceVariables(['statement'], { statement: 'x', seed: 7, param: 1 }, { statement: 'y', seed: 0 })
    ).toEqual({ statement: 'y', seed: 7, param: 1 })
  })
})
