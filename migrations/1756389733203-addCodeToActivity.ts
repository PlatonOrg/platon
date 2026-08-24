import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeToActivity1756389733203 implements MigrationInterface {
    name = 'AddCodeToActivity1756389733203'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" ADD "code" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "code"`);
    }

}
