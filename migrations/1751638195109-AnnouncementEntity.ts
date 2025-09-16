import { MigrationInterface, QueryRunner } from "typeorm";

export class AnnouncementEntity1751638195109 implements MigrationInterface {
    name = 'AnnouncementEntity1751638195109'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Announcements_targetedroles_enum" AS ENUM('admin', 'teacher', 'student', 'demo')`);
        await queryRunner.query(`CREATE TABLE "Announcements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "data" jsonb, "icon" character varying, "version" character varying, "display_until" TIMESTAMP WITH TIME ZONE, "display_duration_in_days" integer, "targetedRoles" "public"."Announcements_targetedroles_enum" array, "actions" jsonb, "publisherId" uuid, CONSTRAINT "PK_758fc79add0389104119de29de5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6d3d257cc762fc7dfd80532118" ON "Announcements" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_4aa4f2503140098201b5582160" ON "Announcements" ("updated_at") `);
        await queryRunner.query(`ALTER TABLE "Announcements" ADD CONSTRAINT "FK_b54d7e30f41e1ae11d608d26274" FOREIGN KEY ("publisherId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Announcements" DROP CONSTRAINT "FK_b54d7e30f41e1ae11d608d26274"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4aa4f2503140098201b5582160"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d3d257cc762fc7dfd80532118"`);
        await queryRunner.query(`DROP TABLE "Announcements"`);
        await queryRunner.query(`DROP TYPE "public"."Announcements_targetedroles_enum"`);
    }

}
