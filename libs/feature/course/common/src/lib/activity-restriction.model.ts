export type RestrictionType = 'DateRange' | 'Correctors' | 'Groups' | 'Members'

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
}

export interface RestrictionList {
  restriction: Restriction[]
}
