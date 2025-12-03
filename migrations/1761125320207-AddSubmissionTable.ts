import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubmissionTable1761125320207 implements MigrationInterface {
    name = 'AddSubmissionTable1761125320207'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "StudentSubmissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "session_id" uuid NOT NULL, "user_id" uuid NOT NULL, "fileName" character varying NOT NULL, "fileSize" integer NOT NULL, "mimeType" character varying NOT NULL, "filePath" character varying NOT NULL, "version" integer NOT NULL DEFAULT '1', "status" character varying(20) NOT NULL DEFAULT 'completed', "checksum" character varying, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL, "submitted_at" TIMESTAMP WITH TIME ZONE, "comment" text, CONSTRAINT "PK_21a236d8febcb5ef526ebc75c0e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_06d9a343e05047fad60ed94b36" ON "StudentSubmissions" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_84e014f8b7cdd60b9bd71a79e2" ON "StudentSubmissions" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "StudentSubmissions_session_idx" ON "StudentSubmissions" ("session_id") `);
        await queryRunner.query(`CREATE INDEX "StudentSubmissions_user_idx" ON "StudentSubmissions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "StudentSubmissions_session_user_idx" ON "StudentSubmissions" ("session_id", "user_id") `);
        await queryRunner.query(`ALTER TABLE "StudentSubmissions" ADD CONSTRAINT "FK_a8ea174910128d12211f8668ea8" FOREIGN KEY ("session_id") REFERENCES "Sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "StudentSubmissions" ADD CONSTRAINT "FK_c6ceb073abd05cd1535b866ee6a" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "StudentSubmissions" DROP CONSTRAINT "FK_c6ceb073abd05cd1535b866ee6a"`);
        await queryRunner.query(`ALTER TABLE "StudentSubmissions" DROP CONSTRAINT "FK_a8ea174910128d12211f8668ea8"`);
        await queryRunner.query(`DROP INDEX "public"."StudentSubmissions_session_user_idx"`);
        await queryRunner.query(`DROP INDEX "public"."StudentSubmissions_user_idx"`);
        await queryRunner.query(`DROP INDEX "public"."StudentSubmissions_session_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_84e014f8b7cdd60b9bd71a79e2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06d9a343e05047fad60ed94b36"`);
        await queryRunner.query(`DROP TABLE "StudentSubmissions"`);
    }

}
