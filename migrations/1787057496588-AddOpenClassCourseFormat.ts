import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOpenClassCourseFormat1787057496588 implements MigrationInterface {
    name = 'AddOpenClassCourseFormat1787057496588'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","ResourceSessionStats","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "ResourceSessionStats"`);
        await queryRunner.query(`CREATE TABLE "CourseLessonProgresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "activity_id" uuid NOT NULL, "user_id" uuid NOT NULL, "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "CourseLessonProgresses_activity_user_idx" UNIQUE ("activity_id", "user_id"), CONSTRAINT "PK_43f8bca060ec3226efc569c543b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8be5a3d209a8c04dc60ff0d361" ON "CourseLessonProgresses" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_23a907cbe8bc93a368c815421c" ON "CourseLessonProgresses" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "CourseLessonProgresses_activity_id_idx" ON "CourseLessonProgresses" ("activity_id") `);
        await queryRunner.query(`CREATE INDEX "CourseLessonProgresses_user_id_idx" ON "CourseLessonProgresses" ("user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."Courses_format_enum" AS ENUM('classic', 'openclass')`);
        await queryRunner.query(`ALTER TABLE "Courses" ADD "format" "public"."Courses_format_enum" NOT NULL DEFAULT 'classic'`);
        await queryRunner.query(`CREATE TYPE "public"."Activities_kind_enum" AS ENUM('exercise', 'lesson')`);
        await queryRunner.query(`ALTER TABLE "Activities" ADD "kind" "public"."Activities_kind_enum" NOT NULL DEFAULT 'exercise'`);
        await queryRunner.query(`ALTER TABLE "Activities" ADD "lesson_title" character varying`);
        await queryRunner.query(`ALTER TABLE "Activities" ADD "content" jsonb`);
        await queryRunner.query(`ALTER TABLE "Activities" ADD "draft" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE INDEX "Activities_kind_idx" ON "Activities" ("kind") `);
        await queryRunner.query(`ALTER TABLE "CourseLessonProgresses" ADD CONSTRAINT "FK_e6d6472f5d739a6f89d83bb9e40" FOREIGN KEY ("activity_id") REFERENCES "Activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CourseLessonProgresses" ADD CONSTRAINT "FK_eb23c136db633b085b7f9847787" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
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
        await queryRunner.query(`ALTER TABLE "CourseLessonProgresses" DROP CONSTRAINT "FK_eb23c136db633b085b7f9847787"`);
        await queryRunner.query(`ALTER TABLE "CourseLessonProgresses" DROP CONSTRAINT "FK_e6d6472f5d739a6f89d83bb9e40"`);
        await queryRunner.query(`DROP INDEX "public"."Activities_kind_idx"`);
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "draft"`);
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "content"`);
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "lesson_title"`);
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "kind"`);
        await queryRunner.query(`DROP TYPE "public"."Activities_kind_enum"`);
        await queryRunner.query(`ALTER TABLE "Courses" DROP COLUMN "format"`);
        await queryRunner.query(`DROP TYPE "public"."Courses_format_enum"`);
        await queryRunner.query(`DROP INDEX "public"."CourseLessonProgresses_user_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."CourseLessonProgresses_activity_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23a907cbe8bc93a368c815421c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8be5a3d209a8c04dc60ff0d361"`);
        await queryRunner.query(`DROP TABLE "CourseLessonProgresses"`);
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
    SUM(attempts) AS total_attempts
  FROM "SessionData"
  WHERE user_id IS NOT NULL
  GROUP BY resource_id`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","ResourceSessionStats","SELECT\n    resource_id,\n    CASE\n      WHEN COUNT(CASE WHEN attempts > 0 THEN 1 END) > 0\n      THEN ROUND(\n        SUM(CASE WHEN attempts > 0 THEN GREATEST(COALESCE(correction_grade, grade), 0) ELSE 0 END)::numeric\n        / COUNT(CASE WHEN attempts > 0 THEN 1 END)\n      )::int\n      ELSE 0\n    END AS avg_score,\n    COUNT(CASE WHEN parent_id IS NULL AND attempts > 0 THEN 1 END)::int AS activity_attempts,\n    COUNT(CASE WHEN parent_id IS NOT NULL AND attempts > 0 THEN 1 END)::int AS exercise_unique_attempts,\n    SUM(attempts) AS total_attempts\n  FROM \"SessionData\"\n  WHERE user_id IS NOT NULL\n  GROUP BY resource_id"]);
    }

}
