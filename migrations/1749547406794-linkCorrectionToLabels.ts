import { MigrationInterface, QueryRunner } from "typeorm";

export class LinkCorrectionToLabels1749547406794 implements MigrationInterface {
    name = 'LinkCorrectionToLabels1749547406794'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" ADD "correction_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" ADD CONSTRAINT "FK_b20e4fa9bbf461ec5e2442fe545" FOREIGN KEY ("correction_id") REFERENCES "Corrections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" DROP CONSTRAINT "FK_b20e4fa9bbf461ec5e2442fe545"`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" DROP COLUMN "correction_id"`);
    }

}
