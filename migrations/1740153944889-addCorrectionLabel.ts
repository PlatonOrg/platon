import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCorrectionLabel1740153944889 implements MigrationInterface {
    name = 'AddCorrectionLabel1740153944889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "CorrectionLabels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "label_id" uuid NOT NULL, "session_id" uuid NOT NULL, "answer_id" uuid NOT NULL, CONSTRAINT "PK_ff0545bcb7054eb3b9ecec6eff0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b3a900ee7b83de18b78ebfaf69" ON "CorrectionLabels" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_088d7117ca41a7963e932257e0" ON "CorrectionLabels" ("updated_at") `);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" ADD CONSTRAINT "FK_50744b81e27cfc896ea8262a2fe" FOREIGN KEY ("label_id") REFERENCES "Labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" ADD CONSTRAINT "FK_3c246b92b24543509f2c0262e39" FOREIGN KEY ("session_id") REFERENCES "Sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" ADD CONSTRAINT "FK_fd281a716b66fcf4cfed5d9941c" FOREIGN KEY ("answer_id") REFERENCES "Answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" DROP CONSTRAINT "FK_fd281a716b66fcf4cfed5d9941c"`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" DROP CONSTRAINT "FK_3c246b92b24543509f2c0262e39"`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" DROP CONSTRAINT "FK_50744b81e27cfc896ea8262a2fe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_088d7117ca41a7963e932257e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3a900ee7b83de18b78ebfaf69"`);
        await queryRunner.query(`DROP TABLE "CorrectionLabels"`);
    }

}
