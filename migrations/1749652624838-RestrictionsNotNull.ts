import { MigrationInterface, QueryRunner } from "typeorm";

export class RestrictionsNotNull1749652624838 implements MigrationInterface {
    name = 'RestrictionsNotNull1749652624838'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" ALTER COLUMN "restrictions" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" ALTER COLUMN "restrictions" DROP NOT NULL`);
    }

}
