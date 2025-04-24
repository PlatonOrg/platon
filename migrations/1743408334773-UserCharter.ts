import { MigrationInterface, QueryRunner } from "typeorm";

export class UserCharter1743408334773 implements MigrationInterface {
    name = 'UserCharter1743408334773'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "UserCharter" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "accepted_user_charter" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_77461fa55ee527bd4bfe428d3a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_54f828174b419d34932d641fd3" ON "UserCharter" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_9ade2e482d026cd53e7ec97678" ON "UserCharter" ("updated_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9ade2e482d026cd53e7ec97678"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54f828174b419d34932d641fd3"`);
        await queryRunner.query(`DROP TABLE "UserCharter"`);
    }

}
