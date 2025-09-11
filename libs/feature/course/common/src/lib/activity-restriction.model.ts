export type RestrictionType = 'DateRange' | 'Correctors' | 'Groups' | 'Members' | 'Others'

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
  Others: {
    enabled?: boolean
  }
}

export interface Restriction {
  type: RestrictionType
  config: RestrictionConfig[keyof RestrictionConfig]
}

export interface RestrictionList {
  restriction: Restriction[]
}
