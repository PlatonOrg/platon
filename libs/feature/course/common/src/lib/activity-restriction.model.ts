export type RestrictionType = 'DateRange' | 'Correctors' | 'Group' | 'Members' | 'Jeu'

export interface RestrictionConfig {
  DateRange: {
    start: Date | undefined
    end: Date | undefined
  }
  Members: {
    members?: string[]
  }
  Correctors: {
    correctors?: string[]
  }
  Groups: {
    groups?: string[]
  }
}

export interface Restriction {
  type: RestrictionType
  config: RestrictionConfig[keyof RestrictionConfig]
  restrictions?: Restriction[]
  condition?: 'must' | 'mustNot'
  allConditions?: 'all' | 'any'
}
