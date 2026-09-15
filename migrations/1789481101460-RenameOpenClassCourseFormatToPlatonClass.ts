import { MigrationInterface, QueryRunner } from "typeorm"

export class RenameOpenClassCourseFormatToPlatonClass1789481101460 implements MigrationInterface {
    name = 'RenameOpenClassCourseFormatToPlatonClass1789481101460'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."Courses_format_enum" RENAME VALUE 'openclass' TO 'platonclass'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."Courses_format_enum" RENAME VALUE 'platonclass' TO 'openclass'`);
    }

}
