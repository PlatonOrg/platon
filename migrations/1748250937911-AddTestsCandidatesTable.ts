import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestsCandidatesTable1748250937911 implements MigrationInterface {
    name = 'AddTestsCandidatesTable1748250937911'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "TestsCandidates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "course_member_id" uuid NOT NULL, "link_id" character varying NOT NULL, CONSTRAINT "PK_6eb0ba44da09ae5b21bebc11cbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e36c16cd7a23f89131fa9875d1" ON "TestsCandidates" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_901d0546d963ba0db281eff9d1" ON "TestsCandidates" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "TestsCandidates_user_id_idx" ON "TestsCandidates" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "TestsCandidates_courseMember_id_idx" ON "TestsCandidates" ("course_member_id") `);
        await queryRunner.query(`ALTER TABLE "TestsCandidates" ADD CONSTRAINT "FK_19332fec9a1303243073f9fefef" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TestsCandidates" ADD CONSTRAINT "FK_97e314c057109184f51e673668e" FOREIGN KEY ("course_member_id") REFERENCES "CourseMembers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "TestsCandidates" DROP CONSTRAINT "FK_97e314c057109184f51e673668e"`);
        await queryRunner.query(`ALTER TABLE "TestsCandidates" DROP CONSTRAINT "FK_19332fec9a1303243073f9fefef"`);
        await queryRunner.query(`DROP INDEX "public"."TestsCandidates_courseMember_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."TestsCandidates_user_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_901d0546d963ba0db281eff9d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e36c16cd7a23f89131fa9875d1"`);
        await queryRunner.query(`DROP TABLE "TestsCandidates"`);
    }

}
