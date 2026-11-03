import { MigrationInterface, QueryRunner } from "typeorm";

export class LmsUsersUniquePerPlatformUser1793716767867 implements MigrationInterface {
    name = 'LmsUsersUniquePerPlatformUser1793716767867'

    // Fails if an LMS user already has several accounts. To list them before deploying to production:
    // SELECT lti_platform_id, lms_user_id, count(*) FROM "LmsUsers" GROUP BY 1, 2 HAVING count(*) > 1
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LmsUsers" DROP CONSTRAINT "LmsUsers_unique_idx"`);
        await queryRunner.query(`ALTER TABLE "LmsUsers" ADD CONSTRAINT "LmsUsers_platform_user_unique_idx" UNIQUE ("lti_platform_id", "lms_user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LmsUsers" DROP CONSTRAINT "LmsUsers_platform_user_unique_idx"`);
        await queryRunner.query(`ALTER TABLE "LmsUsers" ADD CONSTRAINT "LmsUsers_unique_idx" UNIQUE ("lms_user_id", "lti_platform_id", "user_id")`);
    }

}
