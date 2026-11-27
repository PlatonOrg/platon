import { MigrationInterface, QueryRunner } from "typeorm";

export class SetDefaultValueForActivityCode1787242389696 implements MigrationInterface {
    name = 'SetDefaultValueForActivityCode1787242389696'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","ResourceSessionStats","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "ResourceSessionStats"`);
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "Activities" ADD "code" character varying(6) NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6))`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "ResourceSessionStats" AS 
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
  `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","ResourceSessionStats","SELECT\n      resource_id,\n      CASE\n        WHEN COUNT(CASE WHEN attempts > 0 THEN 1 END) > 0\n        THEN ROUND(\n          SUM(CASE WHEN attempts > 0 THEN GREATEST(COALESCE(correction_grade, grade), 0) ELSE 0 END)::numeric\n          / COUNT(CASE WHEN attempts > 0 THEN 1 END)\n        )::int\n        ELSE 0\n      END AS avg_score,\n      COUNT(CASE WHEN parent_id IS NULL AND attempts > 0 THEN 1 END)::int AS activity_attempts,\n      COUNT(CASE WHEN parent_id IS NOT NULL AND attempts > 0 THEN 1 END)::int AS exercise_unique_attempts,\n      COALESCE(SUM(attempts), 0)::int AS total_attempts\n    FROM \"SessionData\"\n    WHERE user_id IS NOT NULL\n    GROUP BY resource_id"]);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e897d4d947ae5d71b1dafeb11d" ON "ResourceSessionStats" ("resource_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e897d4d947ae5d71b1dafeb11d"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","ResourceSessionStats","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "ResourceSessionStats"`);
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "Activities" ADD "code" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "ResourceSessionStats" AS SELECT
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
  GROUP BY resource_id`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","ResourceSessionStats","SELECT\n    resource_id,\n    CASE\n      WHEN COUNT(CASE WHEN attempts > 0 THEN 1 END) > 0\n      THEN ROUND(\n        SUM(CASE WHEN attempts > 0 THEN GREATEST(COALESCE(correction_grade, grade), 0) ELSE 0 END)::numeric\n        / COUNT(CASE WHEN attempts > 0 THEN 1 END)\n      )::int\n      ELSE 0\n    END AS avg_score,\n    COUNT(CASE WHEN parent_id IS NULL AND attempts > 0 THEN 1 END)::int AS activity_attempts,\n    COUNT(CASE WHEN parent_id IS NOT NULL AND attempts > 0 THEN 1 END)::int AS exercise_unique_attempts,\n    COALESCE(SUM(attempts), 0)::int AS total_attempts\n  FROM \"SessionData\"\n  WHERE user_id IS NOT NULL\n  GROUP BY resource_id"]);
    }

}
