export interface CircleResourceStatistic {
  readonly children: number
  readonly circles: number
  readonly exercises: number
  readonly activities: number
  readonly ready: number
  readonly deprecated: number
  readonly bugged: number
  readonly not_tested: number
  readonly draft: number
}

export interface ActivityResourceStatistic {
  readonly attemptCount: number
  readonly averageScore: number
}

export interface ExerciseResourceStatistic {
  readonly attemptCount: number
  readonly averageScore: number
  readonly references?: {
    readonly total: number
    readonly activity: number
    readonly template: number
  }
}

export interface ResourceStatistic {
  readonly score: number
  readonly members: number
  readonly watchers: number

  readonly circle?: CircleResourceStatistic
  readonly activity?: ActivityResourceStatistic
  readonly exercise?: ExerciseResourceStatistic
}
