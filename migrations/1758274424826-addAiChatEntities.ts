import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiChatEntities1758274424826 implements MigrationInterface {
    name = 'AddAiChatEntities1758274424826'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "AiMessages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "chat_id" uuid NOT NULL, "role" character varying(15) NOT NULL, "content" text NOT NULL, CONSTRAINT "PK_b078706c3a4370ce3c5f1840f90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e00b17ee1acd3d3fb6b96bee74" ON "AiMessages" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_3ae65bdbc643af9b1933b5b37b" ON "AiMessages" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "idx_chat_id" ON "AiMessages" ("chat_id") `);
        await queryRunner.query(`CREATE TABLE "AiChats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "title" character varying(127) NOT NULL, CONSTRAINT "PK_c06835d4eab1b1f0c885beca0ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_70769ffee71e2478c121bdd544" ON "AiChats" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_d4c35310e0005b8c0427ae2b42" ON "AiChats" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "idx_user_id" ON "AiChats" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "AiMessages" ADD CONSTRAINT "FK_6025f7ff0195d579c8665649f45" FOREIGN KEY ("chat_id") REFERENCES "AiChats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "AiChats" ADD CONSTRAINT "FK_9b5d5d18598347b8a6a2d707ffb" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
      }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "AiChats" DROP CONSTRAINT "FK_9b5d5d18598347b8a6a2d707ffb"`);
        await queryRunner.query(`ALTER TABLE "AiMessages" DROP CONSTRAINT "FK_6025f7ff0195d579c8665649f45"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d4c35310e0005b8c0427ae2b42"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_70769ffee71e2478c121bdd544"`);
        await queryRunner.query(`DROP TABLE "AiChats"`);
        await queryRunner.query(`DROP INDEX "public"."idx_chat_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ae65bdbc643af9b1933b5b37b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e00b17ee1acd3d3fb6b96bee74"`);
        await queryRunner.query(`DROP TABLE "AiMessages"`);
    }
}
