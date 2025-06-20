import { MigrationInterface, QueryRunner } from "typeorm";

export class AddErrorRecordEntity1749648789951 implements MigrationInterface {
    name = 'AddErrorRecordEntity1749648789951'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "error_record" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "errorHash" character varying(64) NOT NULL, "subject" character varying NOT NULL, "firstOccurrence" TIMESTAMP NOT NULL DEFAULT now(), "lastOccurrence" TIMESTAMP NOT NULL DEFAULT now(), "occurrenceCount" integer NOT NULL DEFAULT '1', "lastNotificationSent" TIMESTAMP, CONSTRAINT "PK_5d1f57f70d21f3bd480edd55f9b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_59084749aab7816926b5195da8" ON "error_record" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_097af9994a267c8423672095f3" ON "error_record" ("updated_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_81a604ad6e91eab45692c4bcfe" ON "error_record" ("errorHash") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_81a604ad6e91eab45692c4bcfe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_097af9994a267c8423672095f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59084749aab7816926b5195da8"`);
        await queryRunner.query(`DROP TABLE "error_record"`);
    }

}
