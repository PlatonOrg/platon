import { NameSimilarityService } from './name-similarity.service'

describe('NameSimilarityService', () => {
  let service: NameSimilarityService

  beforeEach(() => {
    service = new NameSimilarityService()
  })

  describe('normalizeString', () => {
    it('devrait mettre en minuscule', () => {
      expect(service.normalizeString('HELLO')).toBe('hello')
    })

    it('devrait supprimer les accents', () => {
      expect(service.normalizeString('éàüçñ')).toBe('eaucn')
    })

    it("devrait supprimer tout ce qui n'est pas une lettre ou un chiffre", () => {
      expect(service.normalizeString('Niveau 1 - Débutant!')).toBe('niveau1debutant')
    })
  })

  describe('calculateSimilarity', () => {
    it('devrait retourner 1 pour deux chaînes identiques', () => {
      expect(service.calculateSimilarity('abc', 'abc')).toBe(1)
    })

    it('devrait retourner 1 pour deux chaînes vides', () => {
      expect(service.calculateSimilarity('', '')).toBe(1)
    })

    it('devrait retourner 0 pour deux chaînes complètement différentes de même longueur', () => {
      expect(service.calculateSimilarity('abc', 'xyz')).toBe(0)
    })

    it('devrait retourner un score proportionnel au nombre de caractères différents', () => {
      // "debutant" vs "debutants" : distance de Levenshtein = 1 (insertion), longueur max = 9
      expect(service.calculateSimilarity('debutant', 'debutants')).toBeCloseTo(1 - 1 / 9)
    })
  })
})
