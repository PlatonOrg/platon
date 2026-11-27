import { isJsonObject, isJsonObjectOrArray, parseJsonLenient } from './json'

describe('parseJsonLenient', () => {
  it('should parse valid JSON', () => {
    expect(parseJsonLenient('{"a": 1, "b": [true, null]}')).toEqual({
      value: { a: 1, b: [true, null] },
      repaired: false,
    })
  })

  it('should repair common mistakes', () => {
    expect(parseJsonLenient("{a: 'x', b: [1, 2,], // comment\n}")).toEqual({
      value: { a: 'x', b: [1, 2] },
      repaired: true,
    })
  })

  it('should repair python literals', () => {
    expect(parseJsonLenient("{'a': True, 'b': False, 'c': None}")).toEqual({
      value: { a: true, b: false, c: null },
      repaired: true,
    })
  })

  it('should flag truncated JSON as repaired', () => {
    expect(parseJsonLenient('[1, 2')).toEqual({ value: [1, 2], repaired: true })
  })

  it('should parse plain text as a repaired string', () => {
    expect(parseJsonLenient('hello world')).toEqual({ value: 'hello world', repaired: true })
  })

  it('should throw when the text cannot be repaired', () => {
    expect(() => parseJsonLenient('}')).toThrow()
  })
})

describe('isJsonObject', () => {
  it('should only accept plain objects', () => {
    expect(isJsonObject({})).toBe(true)
    expect(isJsonObject([])).toBe(false)
    expect(isJsonObject(null)).toBe(false)
    expect(isJsonObject('{}')).toBe(false)
  })
})

describe('isJsonObjectOrArray', () => {
  it('should accept objects and arrays only', () => {
    expect(isJsonObjectOrArray({})).toBe(true)
    expect(isJsonObjectOrArray([{ a: 1 }])).toBe(true)
    expect(isJsonObjectOrArray(null)).toBe(false)
    expect(isJsonObjectOrArray(42)).toBe(false)
  })
})
