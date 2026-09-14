import { StoreError } from '../errors'
import { MemoryNonceStore } from './memory-nonce-store'

describe('MemoryNonceStore', () => {
  let store: MemoryNonceStore

  beforeEach(() => {
    store = new MemoryNonceStore()
  })

  it('devrait accepter un nonce jamais vu avec un timestamp frais', () => {
    const now = Math.round(Date.now() / 1000)
    expect(() => store.ensuresNotExpired('nonce-1', now)).not.toThrow()
  })

  it('devrait rejeter un nonce déjà utilisé (protection contre le rejeu)', () => {
    const now = Math.round(Date.now() / 1000)
    store.ensuresNotExpired('nonce-1', now)

    expect(() => store.ensuresNotExpired('nonce-1', now)).toThrow(StoreError)
    expect(() => store.ensuresNotExpired('nonce-1', now)).toThrow('Nonce already seen')
  })

  it('devrait rejeter un timestamp expiré (plus vieux que 5 minutes)', () => {
    const expired = Math.round(Date.now() / 1000) - 6 * 60

    expect(() => store.ensuresNotExpired('nonce-2', expired)).toThrow(StoreError)
    expect(() => store.ensuresNotExpired('nonce-2', expired)).toThrow('Expired timestamp')
  })

  it('devrait rejeter un timestamp manquant', () => {
    expect(() => store.ensuresNotExpired('nonce-3a', undefined as unknown as number)).toThrow(StoreError)
    expect(() => store.ensuresNotExpired('nonce-3b', undefined as unknown as number)).toThrow('Timestamp required')
  })

  it('devrait accepter deux nonces différents avec le même timestamp', () => {
    const now = Math.round(Date.now() / 1000)
    store.ensuresNotExpired('nonce-a', now)

    expect(() => store.ensuresNotExpired('nonce-b', now)).not.toThrow()
  })
})
