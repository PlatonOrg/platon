import { encodeRFC3986 } from './utils'

describe('encodeRFC3986', () => {
  it('devrait encoder les caractères réservés standards comme encodeURIComponent', () => {
    expect(encodeRFC3986('a b&c=d')).toBe('a%20b%26c%3Dd')
  })

  it("devrait aussi encoder les caractères !, ', (, ) et * non encodés par encodeURIComponent", () => {
    expect(encodeRFC3986("!'()*")).toBe('%21%27%28%29%2a')
  })

  it('ne devrait pas modifier les caractères non réservés', () => {
    expect(encodeRFC3986('abcDEF123-_.~')).toBe('abcDEF123-_.~')
  })
})
