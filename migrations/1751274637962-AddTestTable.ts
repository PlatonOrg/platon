import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestTable1751274637962 implements MigrationInterface {
    name = 'AddTestTable1751274637962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Test" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "course_id" uuid NOT NULL, "terms" jsonb NOT NULL DEFAULT '{}', "mail_content" jsonb NOT NULL DEFAULT '{}', "mail_subject" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_257c543a36adff226a93de571a2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3d2bacb6b915ee62b2e229fdbe" ON "Test" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_34d9e97256372f7cd5d6918081" ON "Test" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "Test_course_id_idx" ON "Test" ("course_id") `);
        await queryRunner.query(`ALTER TABLE "Test" ADD CONSTRAINT "FK_62e2b9bd728ace27628e406a215" FOREIGN KEY ("course_id") REFERENCES "Courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Test" DROP CONSTRAINT "FK_62e2b9bd728ace27628e406a215"`);
        await queryRunner.query(`DROP INDEX "public"."Test_course_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_34d9e97256372f7cd5d6918081"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d2bacb6b915ee62b2e229fdbe"`);
        await queryRunner.query(`DROP TABLE "Test"`);
    }

}
