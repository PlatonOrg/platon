import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddArchivedToCourseMember1748800000000 implements MigrationInterface {
  name = 'AddArchivedToCourseMember1748800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "CourseMembers" ADD COLUMN "archived" boolean NOT NULL DEFAULT false`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "CourseMembers" DROP COLUMN "archived"`)
  }
}
