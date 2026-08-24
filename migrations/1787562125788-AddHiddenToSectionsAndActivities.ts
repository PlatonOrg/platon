import { MigrationInterface, QueryRunner } from "typeorm"

export class AddHiddenToSectionsAndActivities1787562125788 implements MigrationInterface {
    name = 'AddHiddenToSectionsAndActivities1787562125788'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" ADD COLUMN "hidden" boolean NOT NULL DEFAULT false`)
        await queryRunner.query(`ALTER TABLE "CourseSections" ADD COLUMN "hidden" boolean NOT NULL DEFAULT false`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN "hidden"`)
        await queryRunner.query(`ALTER TABLE "CourseSections" DROP COLUMN "hidden"`)
    }

}
