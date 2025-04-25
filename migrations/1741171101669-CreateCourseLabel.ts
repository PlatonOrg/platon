import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCourseLabel1741171101669 implements MigrationInterface {
    name = 'CreateCourseLabel1741171101669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "CourseLabels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "courseId" uuid NOT NULL, "labelId" uuid NOT NULL, "course_id" uuid, "label_id" uuid, CONSTRAINT "PK_d5305452f5be4395e4d5a17ec45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_462f935b313ba9f4fb712541bc" ON "CourseLabels" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_859580ed60c3d20933eefbb778" ON "CourseLabels" ("updated_at") `);
        await queryRunner.query(`ALTER TABLE "CourseLabels" ADD CONSTRAINT "FK_7e4cab98825c69b49d92841a51c" FOREIGN KEY ("course_id") REFERENCES "Courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CourseLabels" ADD CONSTRAINT "FK_0820150fd38cec858037b0bffdc" FOREIGN KEY ("label_id") REFERENCES "Labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CourseLabels" DROP CONSTRAINT "FK_0820150fd38cec858037b0bffdc"`);
        await queryRunner.query(`ALTER TABLE "CourseLabels" DROP CONSTRAINT "FK_7e4cab98825c69b49d92841a51c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_859580ed60c3d20933eefbb778"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_462f935b313ba9f4fb712541bc"`);
        await queryRunner.query(`DROP TABLE "CourseLabels"`);
    }

}
