/**
 * Tests de non-régression : parseurs HTML des blocs Editor.js ajoutés par la branche feature/open-class.
 *
 * Leur sortie est insérée telle quelle dans la page (EditorjsViewerComponent appelle
 * `bypassSecurityTrustHtml`) : toute donnée de bloc non échappée est une XSS sur l'origine PLaTon.
 * Le contenu d'une leçon est un JSON libre envoyé à l'API (`content: IsObject`), il ne passe donc
 * pas forcément par le nettoyage de l'éditeur : chaque champ doit être considéré comme hostile.
 *
 * `it.failing` = défaut relevé par l'audit (AUD-xx), à passer en `it` une fois corrigé.
 */
import { CalloutParser } from './callout-parser'
import { EmbedParser } from './embed-parser'
import { ExerciseParser } from './exercise-parser'
import { VideoParser } from './video-parser'

const UUID = '0b6f2c9e-4c1a-4d8e-9f3a-2b7c1d0e5f6a'

/**
 * Vrai si une balise du HTML produit porte un attribut on* (onerror, onload...). Les valeurs
 * d'attributs entre guillemets sont d'abord vidées : un « onload= » échappé dans une valeur est inerte.
 */
const hasEventHandlerAttribute = (html: string): boolean =>
  /<[^>]+\son[a-z]+\s*=/i.test(html.replace(/"[^"]*"|'[^']*'/g, '""'))

describe('EmbedParser (non-régression)', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://example.com',
    '//evil.example/x',
    'vbscript:msgbox(1)',
    '',
  ])('refuse la source %p', (embed) => {
    expect(EmbedParser({ embed })).toBe('')
  })

  it("échappe les guillemets de l'URL : impossible de sortir de l'attribut src", () => {
    const html = EmbedParser({ embed: 'https://example.com/" onload="alert(1)' })

    expect(html).toContain('src="https://example.com/&quot; onload=&quot;alert(1)"')
    expect(hasEventHandlerAttribute(html)).toBe(false)
  })

  it('échappe la légende', () => {
    const html = EmbedParser({ embed: 'https://example.com', caption: '<img src=x onerror=alert(1)>' })

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(hasEventHandlerAttribute(html)).toBe(false)
  })

  it('force largeur et hauteur en nombres (pas d’injection d’attribut)', () => {
    const html = EmbedParser({
      embed: 'https://example.com',
      width: '100" onload="alert(1)' as unknown as number,
      height: 300,
    })

    expect(hasEventHandlerAttribute(html)).toBe(false)
    expect(html).toContain('height="300"')
  })

  it('tolère un bloc vide ou malformé', () => {
    expect(EmbedParser(undefined as never)).toBe('')
    expect(EmbedParser({} as never)).toBe('')
  })

  // AUD-12 : tout site https est accepté et affiché dans une iframe sans `sandbox` : une leçon peut
  // encadrer une fausse page de connexion. Attendu : liste blanche des services de @editorjs/embed.
  it.failing.each(['https://evil.example/login', 'https://www.youtube.com.evil.example/embed/x'])(
    'AUD-12 refuse un hôte hors liste blanche (%p)',
    (embed) => {
      expect(EmbedParser({ embed })).toBe('')
    }
  )

  it.failing('AUD-12 isole l’iframe (attribut sandbox)', () => {
    expect(EmbedParser({ embed: 'https://www.youtube.com/embed/abc' })).toMatch(/<iframe[^>]+sandbox=/)
  })
})

describe('VideoParser (non-régression)', () => {
  it.each(['javascript:alert(1)', '//evil.example/v.mp4', 'http://example.com/v.mp4', 'data:video/mp4;base64,AA', ''])(
    'refuse la source %p',
    (url) => {
      expect(VideoParser({ url })).toBe('')
    }
  )

  it.each(['https://cdn.example.com/v.mp4', `/api/v1/courses/${UUID}/files/${UUID}.mp4`])(
    'accepte une URL https ou un fichier de cours relatif (%p)',
    (url) => {
      expect(VideoParser({ url })).toBe(`<div class="video"><video src="${url}" controls></video></div>`)
    }
  )

  it('échappe la légende et l’URL', () => {
    const html = VideoParser({ url: '/a"><script>x</script>', caption: '"><svg onload=alert(1)>' })

    expect(html).not.toContain('<script>')
    expect(hasEventHandlerAttribute(html)).toBe(false)
  })

  // AUD-13 : le navigateur normalise « /\host » en « //host » : la règle anti-URL protocol-relative
  // (commentaire du parseur) est contournable et la vidéo est chargée depuis un hôte arbitraire.
  it.failing('AUD-13 refuse « /\\host/... » (équivalent navigateur de //host)', () => {
    expect(VideoParser({ url: '/\\evil.example/v.mp4' })).toBe('')
  })
})

describe('ExerciseParser (non-régression)', () => {
  it("construit l'iframe d'aperçu attendue par le redimensionnement automatique", () => {
    expect(ExerciseParser({ resourceId: UUID, resourceVersion: 'v1' })).toBe(
      `<div class="exercise"><iframe class="exercise-frame" src="/player/preview/${UUID}?version=v1&amp;autoResize=true&amp;hide-exercise-meta" frameborder="0" scrolling="no"></iframe></div>`
    )
  })

  it.each(['../../admin', `${UUID}/../x`, 'not-a-uuid', `${UUID}"`, ''])(
    "refuse un identifiant de ressource qui n'est pas un UUID (%p)",
    (resourceId) => {
      expect(ExerciseParser({ resourceId, resourceVersion: 'latest' })).toBe('')
    }
  )

  it.each(['latest&x=1', '../v1', '"><script>', 'v 1'])('remplace une version invalide (%p) par latest', (version) => {
    expect(ExerciseParser({ resourceId: UUID, resourceVersion: version })).toContain('?version=latest&amp;')
  })

  it('échappe le titre', () => {
    const html = ExerciseParser({ resourceId: UUID, resourceVersion: 'latest', title: '<b onclick=alert(1)>T</b>' })

    expect(html).toContain('&lt;b onclick=alert(1)&gt;T&lt;/b&gt;')
    expect(hasEventHandlerAttribute(html)).toBe(false)
  })
})

describe('CalloutParser (non-régression)', () => {
  it.each(['info', 'important', 'dialogue'] as const)('rend la variante %p avec sa classe', (variant) => {
    const html = CalloutParser({ variant, text: 'Texte' })

    expect(html).toContain(`class="ce-callout ce-callout--${variant}"`)
    expect(html).toContain('<p>Texte</p>')
  })

  it('conserve la mise en forme en ligne produite par l’éditeur (gras, italique, lien)', () => {
    const text = '<b>gras</b> <i>it</i> <a href="https://example.com">lien</a>'

    expect(CalloutParser({ variant: 'info', text })).toContain(`<p>${text}</p>`)
  })

  // AUD-03a : `variant` est interpolé sans contrôle dans l'attribut class. Une valeur forgée
  // (le contenu est un JSON libre côté API) sort de l'attribut et ajoute un gestionnaire d'événement.
  it.failing("AUD-03 une variante inconnue ne peut pas injecter d'attribut", () => {
    const html = CalloutParser({ variant: 'info" onmouseover="alert(1)' as never, text: 'x' })

    expect(hasEventHandlerAttribute(html)).toBe(false)
  })

  it.failing('AUD-03 une variante inconnue retombe sur « info » (icône et classe cohérentes)', () => {
    const html = CalloutParser({ variant: 'inconnue' as never, text: 'x' })

    expect(html).toContain('ce-callout--info')
  })

  // AUD-03b : `text` est inséré brut. Le texte riche doit être filtré (balises en ligne autorisées,
  // pas de gestionnaires d'événements, pas de <script>, pas d'URL javascript:).
  it.failing.each([
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    '<a href="javascript:alert(1)">clic</a>',
  ])('AUD-03 le texte %p est neutralisé', (text) => {
    const html = CalloutParser({ variant: 'info', text })

    expect(hasEventHandlerAttribute(html)).toBe(false)
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/href\s*=\s*["']?\s*javascript:/i)
  })
})
