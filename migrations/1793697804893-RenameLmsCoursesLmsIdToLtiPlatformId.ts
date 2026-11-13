import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameLmsCoursesLmsIdToLtiPlatformId1793697804893 implements MigrationInterface {
    name = 'RenameLmsCoursesLmsIdToLtiPlatformId1793697804893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LmsCourses" RENAME COLUMN "lms_id" TO "lti_platform_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LmsCourses" RENAME COLUMN "lti_platform_id" TO "lms_id"`);
    }

}
