import { MigrationInterface, QueryRunner } from "typeorm";

export class LabelChange1748943133437 implements MigrationInterface {
    name = 'LabelChange1748943133437'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ResourceLabels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resource_id" uuid NOT NULL, "label_id" uuid NOT NULL, "navigationExerciseId" uuid NOT NULL, "gradeChange" character varying(4) NOT NULL DEFAULT '-0', CONSTRAINT "PK_a90ac25162647e956455078be1a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_df44c4f53776a02dc00636ef4c" ON "ResourceLabels" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_dcd14a3311a2493444ac4aae3c" ON "ResourceLabels" ("updated_at") `);
        await queryRunner.query(`ALTER TABLE "Labels" DROP COLUMN "gradeChange"`);
        await queryRunner.query(`ALTER TABLE "ResourceLabels" ADD CONSTRAINT "FK_7128c1cc4c9e63f728178a7ec76" FOREIGN KEY ("resource_id") REFERENCES "Resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ResourceLabels" ADD CONSTRAINT "FK_ce6eb603e7579489d5313d98900" FOREIGN KEY ("label_id") REFERENCES "Labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ResourceLabels" DROP CONSTRAINT "FK_ce6eb603e7579489d5313d98900"`);
        await queryRunner.query(`ALTER TABLE "ResourceLabels" DROP CONSTRAINT "FK_7128c1cc4c9e63f728178a7ec76"`);
        await queryRunner.query(`ALTER TABLE "Labels" ADD "gradeChange" character varying(4) NOT NULL DEFAULT '-0'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dcd14a3311a2493444ac4aae3c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df44c4f53776a02dc00636ef4c"`);
        await queryRunner.query(`DROP TABLE "ResourceLabels"`);
    }

}
