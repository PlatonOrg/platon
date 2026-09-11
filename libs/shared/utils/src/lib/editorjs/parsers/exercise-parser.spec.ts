import { ExerciseParser } from './exercise-parser'

const RESOURCE_ID = '3f6a1c2e-4b5d-4a1e-9c2f-8e1d2c3b4a5f'

describe('ExerciseParser', () => {
  it('rend une iframe pointant vers /player/preview/:resourceId avec la version fournie', () => {
    const html = ExerciseParser({ resourceId: RESOURCE_ID, resourceVersion: '3' })
    expect(html).toContain(
      `<iframe class="exercise-frame" src="/player/preview/${RESOURCE_ID}?version=3&amp;autoResize=true&amp;hide-exercise-meta"`
    )
  })

  it("retombe sur la version 'latest' quand aucune version n'est fournie", () => {
    const html = ExerciseParser({ resourceId: RESOURCE_ID, resourceVersion: '' })
    expect(html).toContain('?version=latest')
  })

  it('affiche le titre quand il est fourni', () => {
    const html = ExerciseParser({ resourceId: RESOURCE_ID, resourceVersion: '1', title: 'Mon exercice' })
    expect(html).toContain('<div class="exercise-title">Mon exercice</div>')
  })

  it("ne rend rien pour un resourceId qui n'est pas un UUID", () => {
    expect(ExerciseParser({ resourceId: 'not-a-uuid', resourceVersion: '1' })).toBe('')
    expect(ExerciseParser({ resourceId: '../../etc/passwd', resourceVersion: '1' })).toBe('')
  })

  it('ne rend rien sans resourceId', () => {
    expect(ExerciseParser({} as any)).toBe('')
  })

  it('ignore une version non sûre et retombe sur latest', () => {
    const html = ExerciseParser({ resourceId: RESOURCE_ID, resourceVersion: '../../etc/passwd' })
    expect(html).toContain('?version=latest')
  })

  it('échappe le titre pour éviter une injection HTML', () => {
    const html = ExerciseParser({
      resourceId: RESOURCE_ID,
      resourceVersion: '1',
      title: '<img src=x onerror=alert(1)>',
    })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img')
  })
})
