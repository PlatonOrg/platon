import { MigrationInterface, QueryRunner } from "typeorm"

export class RenameLessonTitleToActivityTitle1788859006551 implements MigrationInterface {
    name = 'RenameLessonTitleToActivityTitle1788859006551'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" RENAME COLUMN "lesson_title" TO "activity_title"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Activities" RENAME COLUMN "activity_title" TO "lesson_title"`);
    }

}
