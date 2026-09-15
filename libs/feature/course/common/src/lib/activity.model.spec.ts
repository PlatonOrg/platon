import { calculateActivityOpenState, resolveActivityTitle } from './activity.model'

describe('calculateActivityOpenState', () => {
  it('should return "planned" when openAt is in the future and closeAt is defined', () => {
    const value = {
      openAt: new Date(Date.now() + 86400000), // Tomorrow
      closeAt: new Date(Date.now() + 172800000), // Day after tomorrow
    }

    const result = calculateActivityOpenState(value)

    expect(result).toBe('planned')
  })

  it('should return "opened" when openAt is in the past and closeAt is defined', () => {
    const value = {
      openAt: new Date(Date.now() - 86400000), // Yesterday
      closeAt: new Date(Date.now() + 86400000), // Tomorrow
    }

    const result = calculateActivityOpenState(value)

    expect(result).toBe('opened')
  })

  it('should return "closed" when closeAt is in the past and openAt is defined', () => {
    const value = {
      openAt: new Date(Date.now() - 86400000), // Yesterday
      closeAt: new Date(Date.now() - 43200000), // 12 hours ago
    }

    const result = calculateActivityOpenState(value)

    expect(result).toBe('closed')
  })

  it('should return "opened" when openAt is in the past and closeAt is not defined', () => {
    const value = {
      openAt: new Date(Date.now() - 86400000), // Yesterday
    }

    const result = calculateActivityOpenState(value)

    expect(result).toBe('opened')
  })

  it('should return "opened" when closeAt is in the future and openAt is not defined', () => {
    const value = {
      closeAt: new Date(Date.now() + 86400000), // Tomorrow
    }

    const result = calculateActivityOpenState(value)

    expect(result).toBe('opened')
  })

  it('should return "opened" when neither openAt nor closeAt are defined', () => {
    const value = {}

    const result = calculateActivityOpenState(value)

    expect(result).toBe('opened')
  })
})

describe('resolveActivityTitle', () => {
  it('should return the teacher override when it is defined', () => {
    expect(resolveActivityTitle('Titre personnalisé', 'Titre du PL', 'Nom de la ressource')).toBe('Titre personnalisé')
  })

  it('should fall back to the next candidate when the override is empty or blank', () => {
    expect(resolveActivityTitle('', 'Titre du PL', 'Nom de la ressource')).toBe('Titre du PL')
    expect(resolveActivityTitle('   ', 'Titre du PL', 'Nom de la ressource')).toBe('Titre du PL')
    expect(resolveActivityTitle(undefined, 'Titre du PL', 'Nom de la ressource')).toBe('Titre du PL')
  })

  it('should skip blank candidates and use the first non-empty one', () => {
    expect(resolveActivityTitle(undefined, '', 'Nom de la ressource')).toBe('Nom de la ressource')
    expect(resolveActivityTitle(undefined, undefined, 'Nom de la ressource')).toBe('Nom de la ressource')
  })

  it('should trim the resolved title', () => {
    expect(resolveActivityTitle('  Titre avec espaces  ')).toBe('Titre avec espaces')
  })

  it('should return an empty string when every candidate is empty or missing', () => {
    expect(resolveActivityTitle()).toBe('')
    expect(resolveActivityTitle(undefined, null, '   ')).toBe('')
  })
})
