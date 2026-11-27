export const RestrictionType = {
  DateRange: 'DateRange',
  Correctors: 'Correctors',
  Groups: 'Groups',
  Members: 'Members',
  Others: 'Others',
} as const

export type RestrictionType = (typeof RestrictionType)[keyof typeof RestrictionType]

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
// ActivityRestrictions
export interface RestrictionList {
  restriction: Restriction[]
}
