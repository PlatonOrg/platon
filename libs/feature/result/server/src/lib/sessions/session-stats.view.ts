import { Index, ViewColumn, ViewEntity } from 'typeorm'

@ViewEntity({
  name: 'ResourceSessionStats',
  materialized: true,
  expression: `
    SELECT
      resource_id,
      CASE
        WHEN COUNT(CASE WHEN attempts > 0 THEN 1 END) > 0
        THEN ROUND(
          SUM(CASE WHEN attempts > 0 THEN GREATEST(COALESCE(correction_grade, grade), 0) ELSE 0 END)::numeric
          / COUNT(CASE WHEN attempts > 0 THEN 1 END)
        )::int
        ELSE 0
      END AS avg_score,
      COUNT(CASE WHEN parent_id IS NULL AND attempts > 0 THEN 1 END)::int AS activity_attempts,
      COUNT(CASE WHEN parent_id IS NOT NULL AND attempts > 0 THEN 1 END)::int AS exercise_unique_attempts,
      COALESCE(SUM(attempts), 0)::int AS total_attempts
    FROM "SessionData"
    WHERE user_id IS NOT NULL
    GROUP BY resource_id
  `,
})
export class ResourceSessionStatsView {
  @Index({ unique: true })
  @ViewColumn({ name: 'resource_id' })
  resourceId!: string

  @ViewColumn({ name: 'avg_score' })
  avgScore!: number

  @ViewColumn({ name: 'activity_attempts' })
  activityAttempts!: number

  @ViewColumn({ name: 'exercise_unique_attempts' })
  exerciseUniqueAttempts!: number

  @ViewColumn({ name: 'total_attempts' })
  totalAttempts!: number
}
