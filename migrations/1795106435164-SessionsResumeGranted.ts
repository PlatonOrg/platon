import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One-shot resume permission of a root activity session, granted when a teacher reopens a started
 * session and consumed by the next `/player/play/activity` call.
 */
export class SessionsResumeGranted1795106435164 implements MigrationInterface {
    name = 'SessionsResumeGranted1795106435164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Sessions" ADD "resume_granted" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Sessions" DROP COLUMN "resume_granted"`);
    }

}
