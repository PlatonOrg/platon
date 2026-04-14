import * as fs from 'fs'
import * as path from 'path'
import { ALL_TUTO_SELECTORS } from './tuto-selectors.registry'

/**
 * Scanne récursivement un dossier et retourne tous les fichiers .html
 */
function findHtmlFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      results.push(...findHtmlFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * Extrait tous les id="tuto-*" d'un contenu HTML (statiques et dynamiques).
 *
 * Détecte :
 *  - id="tuto-xxx"           (statique)
 *  - [attr.id]="...tuto-xxx..." (Angular binding)
 *  - [id]="...tuto-xxx..."      (Angular binding)
 */
interface ExtractResult {
  ids: string[]
  dynamicPrefixes: string[]
}

function extractTutoIds(content: string): ExtractResult {
  const ids: string[] = []
  const dynamicPrefixes: string[] = []

  // IDs statiques : id="tuto-xxx"
  const staticRegex = /id="(tuto[-_][^"]+)"/g
  let match
  while ((match = staticRegex.exec(content)) !== null) {
    ids.push(match[1])
  }

  // IDs dynamiques : [attr.id]="..." ou [id]="..." contenant tuto-
  const dynamicRegex = /\[(?:attr\.)?id\]="([^"]+)"/g
  while ((match = dynamicRegex.exec(content)) !== null) {
    const expression = match[1]
    const literalRegex = /'(tuto[-_][^']+)'/g
    let literalMatch
    while ((literalMatch = literalRegex.exec(expression)) !== null) {
      const value = literalMatch[1]
      // Si le littéral se termine par '-', c'est un préfixe dynamique (ex: 'tuto-section-' + id)
      if (value.endsWith('-') || value.endsWith('_')) {
        dynamicPrefixes.push(value)
      } else {
        ids.push(value)
      }
    }
  }

  return { ids, dynamicPrefixes }
}

/**
 * Scanne aussi les fichiers .ts pour trouver les IDs générés dynamiquement
 * via des patterns comme `'tuto-sidebar-' + title.toLowerCase()...`
 * Retourne les préfixes détectés (ex: 'tuto-sidebar-')
 */
function extractDynamicPrefixes(dir: string): string[] {
  const prefixes: string[] = []
  const tsFiles = findTsFiles(dir)

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    // Pattern: 'tuto-xxx-' + quelquechose (génération dynamique d'IDs)
    const prefixRegex = /'(tuto[-_][^']*-)'\s*\+/g
    let match
    while ((match = prefixRegex.exec(content)) !== null) {
      prefixes.push(match[1])
    }
  }

  return prefixes
}

function findTsFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      results.push(...findTsFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.component.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

function findProjectRoot(startDir: string): string {
  let dir = startDir
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'nx.json'))) {
      return dir
    }
    dir = path.dirname(dir)
  }
  throw new Error('Impossible de trouver la racine du projet (nx.json introuvable)')
}

describe('Tuto selectors registry', () => {
  const projectRoot = findProjectRoot(__dirname)
  const scanDirs = [path.join(projectRoot, 'apps'), path.join(projectRoot, 'libs')]

  const htmlFiles: string[] = []
  let allHtmlContent: Map<string, string>
  let idsInTemplates: Set<string>
  const dynamicPrefixes: string[] = []

  beforeAll(() => {
    allHtmlContent = new Map()
    idsInTemplates = new Set()

    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        htmlFiles.push(...findHtmlFiles(dir))
        dynamicPrefixes.push(...extractDynamicPrefixes(dir))
      }
    }

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      allHtmlContent.set(file, content)
      const result = extractTutoIds(content)
      for (const id of result.ids) {
        idsInTemplates.add(id)
      }
      dynamicPrefixes.push(...result.dynamicPrefixes)
    }
  })

  it('devrait trouver des fichiers HTML dans le projet', () => {
    expect(htmlFiles.length).toBeGreaterThan(0)
  })

  it('devrait trouver des IDs tuto-* dans les templates', () => {
    expect(idsInTemplates.size).toBeGreaterThan(0)
  })

  describe('chaque sélecteur du registre existe dans un template HTML ou est généré dynamiquement', () => {
    const selectors = [...ALL_TUTO_SELECTORS]

    it.each(selectors)('%s doit exister dans un template ou correspondre à un préfixe dynamique', (selector) => {
      const foundStatic = idsInTemplates.has(selector)
      const foundDynamic = dynamicPrefixes.some((prefix) => selector.startsWith(prefix))

      expect(foundStatic || foundDynamic).toBe(true)
    })
  })

  describe('chaque id="tuto-*" dans les templates est référencé dans le registre', () => {
    it('tous les IDs tuto-* des templates doivent être dans ALL_TUTO_SELECTORS', () => {
      const registrySet = new Set<string>(ALL_TUTO_SELECTORS)
      const missing: { id: string; file: string }[] = []

      for (const [file, content] of allHtmlContent.entries()) {
        const result = extractTutoIds(content)
        for (const id of result.ids) {
          if (!registrySet.has(id)) {
            missing.push({ id, file: path.relative(projectRoot, file) })
          }
        }
      }

      const details = missing.map((m) => `  - "${m.id}" dans ${m.file}`).join('\n')
      expect(missing).toEqual(
        expect.objectContaining({ length: 0 }) // message ci-dessous si échec
      )
      if (missing.length > 0) {
        throw new Error(
          `${missing.length} ID(s) tuto-* trouvé(s) dans les templates mais absent(s) du registre :\n${details}\n\n` +
            `Ajoutez-les dans tuto-selectors.registry.ts ou supprimez-les des templates.`
        )
      }
    })
  })
})
