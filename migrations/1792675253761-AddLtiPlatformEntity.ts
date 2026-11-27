import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLtiPlatformEntity1792675253761 implements MigrationInterface {
    name = 'AddLtiPlatformEntity1792675253761'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lti_platform" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" text NOT NULL, "url" text NOT NULL, "client_id" text NOT NULL, "authentication_endpoint" text NOT NULL, "access_token_endpoint" text NOT NULL, "authorization_server" text, "id_token_validation" jsonb NOT NULL, "active" boolean NOT NULL DEFAULT false, "public_key" text NOT NULL, "private_key" text NOT NULL, CONSTRAINT "PK_366bdc87bf7611fbda944dc3c40" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6180a15cb3e3075bba63642756" ON "lti_platform" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_6cbab1492b037b6e355696b1a2" ON "lti_platform" ("updated_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e70d5213473098604265d254b3" ON "lti_platform" ("url", "client_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e70d5213473098604265d254b3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6cbab1492b037b6e355696b1a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6180a15cb3e3075bba63642756"`);
        await queryRunner.query(`DROP TABLE "lti_platform"`);
    }

}
