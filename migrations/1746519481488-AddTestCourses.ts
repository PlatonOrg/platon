import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestCourses1746519481488 implements MigrationInterface {
    name = 'AddTestCourses1746519481488'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Courses" ADD "is_test" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Courses" DROP COLUMN "is_test"`);
    }

}
