import { MigrationInterface, QueryRunner } from "typeorm";

export class JoinCorrectionAndResourceLabel1748963117204 implements MigrationInterface {
    name = 'JoinCorrectionAndResourceLabel1748963117204'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" ADD "resource_label_id" uuid`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" ADD CONSTRAINT "FK_747e1038c178386c66741b221bc" FOREIGN KEY ("resource_label_id") REFERENCES "ResourceLabels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" DROP CONSTRAINT "FK_747e1038c178386c66741b221bc"`);
        await queryRunner.query(`ALTER TABLE "CorrectionLabels" DROP COLUMN "resource_label_id"`);
    }

}
