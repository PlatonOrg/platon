import { SessionDataEntity } from '../../sessions/session-data.entity'
import { UserExerciseCount } from './user.aggregator'

describe('UserExerciseCount', () => {
  let aggregator: UserExerciseCount

  beforeEach(() => {
    aggregator = new UserExerciseCount()
  })

  it('devrait démarrer à 0', () => {
    expect(aggregator.complete()).toBe(0)
  })

  it('devrait compter uniquement les sessions ayant au moins une tentative', () => {
    aggregator.next({ attempts: 1 } as SessionDataEntity)
    aggregator.next({ attempts: 0 } as SessionDataEntity)
    aggregator.next({ attempts: 3 } as SessionDataEntity)

    expect(aggregator.complete()).toBe(2)
  })
})
