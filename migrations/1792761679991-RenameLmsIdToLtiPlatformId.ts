import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameLmsIdToLtiPlatformId1792761679991 implements MigrationInterface {
    name = 'RenameLmsIdToLtiPlatformId1792761679991'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LmsUsers" DROP CONSTRAINT "FK_f54bf115485bb640e184edda955"`);
        await queryRunner.query(`ALTER TABLE "LmsUsers" RENAME COLUMN "lms_id" TO "lti_platform_id"`);
        await queryRunner.query(`ALTER TABLE "LmsCourses" DROP CONSTRAINT "FK_bd62dae188db7e2aee5f64c9641"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LmsUsers" RENAME COLUMN "lti_platform_id" TO "lms_id"`);
        await queryRunner.query(`ALTER TABLE "LmsUsers" ADD CONSTRAINT "FK_f54bf115485bb640e184edda955" FOREIGN KEY ("lms_id") REFERENCES "Lmses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LmsCourses" ADD CONSTRAINT "FK_bd62dae188db7e2aee5f64c9641" FOREIGN KEY ("lms_id") REFERENCES "Lmses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
