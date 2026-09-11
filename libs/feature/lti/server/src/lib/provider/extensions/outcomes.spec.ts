import { ExtensionError, ParameterError } from '../errors'
import { LTIProvider } from '../provider'
import { OutcomeService } from './outcomes'

// sendReplaceResult() avec un score valide atteint sendRequest(), qui ouvrirait une vraie connexion
// réseau (indisponible en CI) si https.request n'était pas mocké ici.
jest.mock('https', () => ({
  request: jest.fn(() => ({ on: jest.fn(), write: jest.fn(), end: jest.fn() })),
  globalAgent: {},
}))

describe('OutcomeService', () => {
  const buildService = (resultDataTypes: string[] = []) =>
    new OutcomeService({
      consumerKey: 'key',
      consumerSecret: 'secret',
      serviceUrl: 'https://lms.example.com/outcomes',
      sourceDID: 'source-1',
      resultDataTypes,
    })

  describe('supportsResultData', () => {
    it("devrait retourner false quand aucun type de données de résultat n'est configuré", () => {
      const service = buildService([])
      expect(service.supportsResultData('text')).toBeFalsy()
    })

    it('devrait retourner true pour un type explicitement supporté', () => {
      const service = buildService(['text', 'url'])
      expect(service.supportsResultData('text')).toBe(true)
      expect(service.supportsResultData('image')).toBe(false)
    })
  })

  describe('sendReplaceResult', () => {
    it("devrait lever une ParameterError si le score n'est pas dans [0, 1]", () => {
      const service = buildService()
      expect(() => service.sendReplaceResult(-0.1)).toThrow(ParameterError)
      expect(() => service.sendReplaceResult(1.1)).toThrow(ParameterError)
    })

    it('ne devrait pas lever pour un score valide aux bornes', () => {
      const service = buildService()
      expect(() => service.sendReplaceResult(0)).not.toThrow()
      expect(() => service.sendReplaceResult(1)).not.toThrow()
    })
  })

  describe('sendReplaceResultWithText', () => {
    it("devrait lever une ExtensionError si le type 'text' n'est pas supporté", () => {
      const service = buildService([])
      expect(() => service.sendReplaceResultWithText(0.5, 'hello')).toThrow(ExtensionError)
    })

    it('devrait valider le score avant de vérifier le support du type', () => {
      const service = buildService(['text'])
      expect(() => service.sendReplaceResultWithText(2, 'hello')).toThrow(ParameterError)
    })
  })

  describe('sendReplaceResultWithUrl', () => {
    it("devrait lever une ExtensionError si le type 'url' n'est pas supporté", () => {
      const service = buildService(['text'])
      expect(() => service.sendReplaceResultWithUrl(0.5, 'https://x.com')).toThrow(ExtensionError)
    })
  })

  describe('fromProvider', () => {
    it('devrait construire un OutcomeService quand le payload contient les infos requises', () => {
      const provider = new LTIProvider('key', 'secret')
      Object.assign(provider.body, {
        lis_outcome_service_url: 'https://lms.example.com/outcomes',
        lis_result_sourcedid: 'source-1',
        ext_outcome_data_values_accepted: 'text,url',
      })

      const service = OutcomeService.fromProvider(provider)

      expect(service).toBeInstanceOf(OutcomeService)
      expect(service?.supportsResultData('text')).toBe(true)
      expect(service?.supportsResultData('url')).toBe(true)
      expect(service?.supportsResultData('image')).toBe(false)
    })

    it('devrait retourner undefined si lis_outcome_service_url est absent', () => {
      const provider = new LTIProvider('key', 'secret')
      Object.assign(provider.body, { lis_result_sourcedid: 'source-1' })

      expect(OutcomeService.fromProvider(provider)).toBeUndefined()
    })

    it('devrait retourner undefined si lis_result_sourcedid est absent', () => {
      const provider = new LTIProvider('key', 'secret')
      Object.assign(provider.body, { lis_outcome_service_url: 'https://lms.example.com/outcomes' })

      expect(OutcomeService.fromProvider(provider)).toBeUndefined()
    })

    it('ne devrait déclarer aucun type de donnée supporté sans ext_outcome_data_values_accepted', () => {
      const provider = new LTIProvider('key', 'secret')
      Object.assign(provider.body, {
        lis_outcome_service_url: 'https://lms.example.com/outcomes',
        lis_result_sourcedid: 'source-1',
      })

      const service = OutcomeService.fromProvider(provider)

      expect(service?.supportsResultData('text')).toBeFalsy()
    })
  })
})
