import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRestrictionToActivity1738061198390 implements MigrationInterface {
    name = 'AddRestrictionToActivity1738061198390'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" ADD "restrictions" jsonb NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "restrictions"`);
    }

}
