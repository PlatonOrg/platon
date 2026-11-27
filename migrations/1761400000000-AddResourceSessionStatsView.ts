import { MigrationInterface, QueryRunner } from 'typeorm'

const VIEW_SQL = `
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
`

export class AddResourceSessionStatsView1761400000000 implements MigrationInterface {
  name = 'AddResourceSessionStatsView1761400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE MATERIALIZED VIEW "ResourceSessionStats" AS ${VIEW_SQL}`)
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      ['public', 'MATERIALIZED_VIEW', 'ResourceSessionStats', VIEW_SQL.trim()]
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ResourceSessionStats_resource_id" ON "ResourceSessionStats" ("resource_id")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_ResourceSessionStats_resource_id"`)
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['MATERIALIZED_VIEW', 'ResourceSessionStats', 'public']
    )
    await queryRunner.query(`DROP MATERIALIZED VIEW "ResourceSessionStats"`)
  }
}
