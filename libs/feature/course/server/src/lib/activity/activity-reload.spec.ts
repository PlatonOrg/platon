import {
  ActivityExercise,
  ActivityVariables,
  PLCompiler,
  PLReferenceResolver,
  PLSourceFile,
} from '@platon/feature/compiler'
import { diffActivityExercises, exerciseFingerprint, planActivityReload } from './activity-reload'

const source = (title: string, extra: Record<string, unknown> = {}): PLSourceFile =>
  ({
    resource: 'r',
    version: 'latest',
    abspath: 'r:latest/main.ple',
    dependencies: [],
    variables: { title, ...extra },
  } as unknown as PLSourceFile)

const exercise = (id: string, resource: string, title: string, groupId = 0): ActivityExercise => ({
  id,
  groupId,
  resource,
  version: 'latest',
  source: source(title),
})

const activity = (...groups: ActivityExercise[][]): ActivityVariables =>
  ({
    title: 'a',
    introduction: '',
    conclusion: '',
    exerciseGroups: Object.fromEntries(
      groups.map((exercises, index) => [index, { name: `g${index}`, grader: { type: 'empty' }, exercises }])
    ),
  } as unknown as ActivityVariables)

describe('exerciseFingerprint', () => {
  it('ignore les cid, la graine, la version et ordre des clés', () => {
    const a = source('t', { c: { cid: '1', selector: 'wc-a', x: 1, y: 2 }, seed: 1 })
    const b = {
      ...source('t', { c: { y: 2, x: 1, selector: 'wc-a', cid: '2' }, seed: 9 }),
      version: 'v2',
    } as PLSourceFile
    expect(exerciseFingerprint(a)).toEqual(exerciseFingerprint(b))
  })

  it('garde un champ cid qui n appartient pas à un composant', () => {
    expect(exerciseFingerprint(source('t', { c: { cid: '1' } }))).not.toEqual(
      exerciseFingerprint(source('t', { c: { cid: '2' } }))
    )
  })

  it('détecte une modification du contenu et des fichiers inclus', () => {
    const base = source('t')
    expect(exerciseFingerprint(base)).not.toEqual(exerciseFingerprint(source('u')))
    const withFile = { ...base, dependencies: [{ alias: 'f', abspath: 'x', content: '', hash: 'h1', lineno: 1 }] }
    const changedFile = { ...base, dependencies: [{ alias: 'f', abspath: 'y', content: '', hash: 'h2', lineno: 1 }] }
    expect(exerciseFingerprint(withFile)).not.toEqual(exerciseFingerprint(changedFile))
  })

  it('donne le même résultat pour deux compilations réelles, après passage par la base', async () => {
    const content = `title = "T"\nform = "x"\ninput = :wc-input-box\ninput.value = 1\n`
    const resolver = {
      exists: async () => false,
      isDir: async () => false,
      listDir: async () => [],
      resolveUrl: async () => 'url',
      resolveContent: async () => content,
    } as unknown as PLReferenceResolver
    const compile = async () => {
      const compiler = new PLCompiler({ resource: 'a', version: 'latest', main: 'main.pla', resolver })
      await compiler.compile(
        JSON.stringify({
          title: 'a',
          exerciseGroups: {
            0: { name: 'g', grader: { type: 'empty' }, exercises: [{ resource: 'r', version: 'latest' }] },
          },
        })
      )
      return (await compiler.output()).variables as unknown as ActivityVariables
    }
    const [first, second] = [await compile(), await compile()]
    const stored = JSON.parse(JSON.stringify(first)) as ActivityVariables
    expect(stored.exerciseGroups[0].exercises[0].id).not.toEqual(second.exerciseGroups[0].exercises[0].id)
    expect(diffActivityExercises(stored, second).map((d) => d.status)).toEqual(['unchanged'])
  })
})

describe('diffActivityExercises', () => {
  it('apparie par ressource malgré les nouveaux id', () => {
    const diffs = diffActivityExercises(
      activity([exercise('o1', 'r1', 'A'), exercise('o2', 'r2', 'B'), exercise('o3', 'r3', 'C')]),
      activity([exercise('n1', 'r1', 'A'), exercise('n2', 'r2', 'B2'), exercise('n4', 'r4', 'D')])
    )
    expect(diffs.map((d) => [d.key, d.status])).toEqual([
      ['o1', 'unchanged'],
      ['o2', 'modified'],
      ['added:r4:1', 'added'],
      ['o3', 'removed'],
    ])
  })

  it('distingue deux occurrences de la même ressource par leur contenu', () => {
    const diffs = diffActivityExercises(
      activity([exercise('o1', 'r', 'A'), exercise('o2', 'r', 'B')]),
      activity([exercise('n1', 'r', 'B'), exercise('n2', 'r', 'C')])
    )
    expect(diffs.map((d) => [d.key, d.status])).toEqual([
      ['o2', 'unchanged'],
      ['o1', 'modified'],
    ])
  })
})

describe('planActivityReload', () => {
  const previous = () =>
    activity([exercise('o1', 'r1', 'A'), exercise('o2', 'r2', 'B')], [exercise('o3', 'r3', 'C', 1)])
  const next = () => activity([exercise('n1', 'r1', 'A'), exercise('n2', 'r2', 'B2'), exercise('n4', 'r4', 'D')])

  it('recharge par défaut tout ce qui a changé', () => {
    const plan = planActivityReload(previous(), next())
    expect(plan.resetExerciseIds).toEqual(['o2'])
    expect(plan.removedExerciseIds).toEqual(['o3'])
    expect(plan.variables.exerciseGroups[0].exercises.map((e) => e.id)).toEqual(['o1', 'o2', 'n4'])
    expect(plan.variables.exerciseGroups[0].exercises[1].source.variables['title']).toEqual('B2')
    expect(plan.variables.exerciseGroups[1]).toBeUndefined()
  })

  it('ne touche pas aux exercices non sélectionnés', () => {
    const plan = planActivityReload(previous(), next(), [])
    expect(plan.resetExerciseIds).toEqual([])
    expect(plan.removedExerciseIds).toEqual([])
    expect(plan.variables.exerciseGroups[0].exercises.map((e) => e.id)).toEqual(['o1', 'o2'])
    expect(plan.variables.exerciseGroups[0].exercises[1].source.variables['title']).toEqual('B')
    expect(plan.variables.exerciseGroups[1].exercises.map((e) => e.id)).toEqual(['o3'])
  })

  it('un exercice inchangé sélectionné ne détruit rien', () => {
    const plan = planActivityReload(previous(), next(), ['o1'])
    expect(plan.resetExerciseIds).toEqual([])
    expect(plan.removedExerciseIds).toEqual([])
  })

  it("ne détruit pas un exercice modifié après l'aperçu", () => {
    // The preview listed only o2 as modified, then r1 was published again before the reload.
    const republished = activity(
      [exercise('n1', 'r1', 'A2'), exercise('n2', 'r2', 'B2')],
      [exercise('n3', 'r3', 'C', 1)]
    )
    const plan = planActivityReload(previous(), republished, ['o2'])
    expect(plan.resetExerciseIds).toEqual(['o2'])
    expect(plan.variables.exerciseGroups[0].exercises[0].source.variables['title']).toEqual('A')
  })

  it('recharge uniquement la sélection', () => {
    const plan = planActivityReload(previous(), next(), ['o2'])
    expect(plan.resetExerciseIds).toEqual(['o2'])
    expect(plan.variables.exerciseGroups[0].exercises.map((e) => e.id)).toEqual(['o1', 'o2'])
    expect(plan.variables.exerciseGroups[1].exercises.map((e) => e.id)).toEqual(['o3'])
  })

  it('recharge en gardant les réponses sans détruire les données', () => {
    const plan = planActivityReload(previous(), next(), ['o2'], ['o2'])
    expect(plan.resetExerciseIds).toEqual([])
    expect(plan.patchedExercises).toEqual([{ id: 'o2', variables: ['title'] }])
    expect(plan.variables.exerciseGroups[0].exercises[1].source.variables['title']).toEqual('B2')
  })

  it('ignore la conservation des réponses pour un exercice non sélectionné ou non modifié', () => {
    const plan = planActivityReload(previous(), next(), ['o1'], ['o1', 'o2'])
    expect(plan.patchedExercises).toEqual([])
    expect(plan.resetExerciseIds).toEqual([])
  })
})
