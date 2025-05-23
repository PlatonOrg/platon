import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGradeChange1747731441878 implements MigrationInterface {
    name = 'AddGradeChange1747731441878'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Labels" ADD "gradeChange" character varying(4) NOT NULL DEFAULT '-0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Labels" DROP COLUMN "gradeChange"`);
    }

}
