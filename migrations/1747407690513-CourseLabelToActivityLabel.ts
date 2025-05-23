import { MigrationInterface, QueryRunner } from "typeorm";

export class CourseLabelToActivityLabel1747407690513 implements MigrationInterface {
    name = 'CourseLabelToActivityLabel1747407690513'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ActivityLabels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "activity_id" uuid NOT NULL, "label_id" uuid NOT NULL, CONSTRAINT "PK_047685bfa591e90c54a46a23c6d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_24cbf498b8b07afca0efd212e1" ON "ActivityLabels" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_f9f5be0112a28063cfdcabaf0f" ON "ActivityLabels" ("updated_at") `);
        await queryRunner.query(`ALTER TABLE "ActivityLabels" ADD CONSTRAINT "FK_6b57c12b5c8b6d618ef6d8ccfec" FOREIGN KEY ("activity_id") REFERENCES "Activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ActivityLabels" ADD CONSTRAINT "FK_6fc24b568cff14b1d483ebc8e82" FOREIGN KEY ("label_id") REFERENCES "Labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ActivityLabels" DROP CONSTRAINT "FK_6fc24b568cff14b1d483ebc8e82"`);
        await queryRunner.query(`ALTER TABLE "ActivityLabels" DROP CONSTRAINT "FK_6b57c12b5c8b6d618ef6d8ccfec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f9f5be0112a28063cfdcabaf0f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24cbf498b8b07afca0efd212e1"`);
        await queryRunner.query(`DROP TABLE "ActivityLabels"`);
    }

}
