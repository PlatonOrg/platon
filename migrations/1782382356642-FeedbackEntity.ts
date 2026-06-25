import { MigrationInterface, QueryRunner } from "typeorm";

export class FeedbackEntity1782382356642 implements MigrationInterface {
    name = 'FeedbackEntity1782382356642'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Feedbacks_category_enum" AS ENUM('statement', 'answer', 'accessibility', 'technical', 'other')`);
        await queryRunner.query(`CREATE TABLE "Feedbacks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "session_id" uuid NOT NULL, "exercise_title" character varying, "sender_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000', "creator_id" character varying, "category" "public"."Feedbacks_category_enum" NOT NULL, "message" text, CONSTRAINT "PK_2a57575bac40d1a302ef02a8530" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c6763f25b8c60b0eaff080a0a9" ON "Feedbacks" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_89a218cec414e2b44e78558c98" ON "Feedbacks" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "Feedbacks_session_id_idx" ON "Feedbacks" ("session_id") `);
        await queryRunner.query(`ALTER TABLE "Feedbacks" ADD CONSTRAINT "FK_ab01e33f15da34b0b6108e8b7c2" FOREIGN KEY ("session_id") REFERENCES "Sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Feedbacks" ADD CONSTRAINT "FK_0b1fd9ba79d3ddc3ea15db71d13" FOREIGN KEY ("sender_id") REFERENCES "Users"("id") ON DELETE SET DEFAULT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Feedbacks" DROP CONSTRAINT "FK_0b1fd9ba79d3ddc3ea15db71d13"`);
        await queryRunner.query(`ALTER TABLE "Feedbacks" DROP CONSTRAINT "FK_ab01e33f15da34b0b6108e8b7c2"`);
        await queryRunner.query(`DROP INDEX "public"."Feedbacks_session_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_89a218cec414e2b44e78558c98"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c6763f25b8c60b0eaff080a0a9"`);
        await queryRunner.query(`DROP TABLE "Feedbacks"`);
        await queryRunner.query(`DROP TYPE "public"."Feedbacks_category_enum"`);
    }

}
