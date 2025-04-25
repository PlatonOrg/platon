import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserFavLabels1741185646754 implements MigrationInterface {
    name = 'CreateUserFavLabels1741185646754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "UserFavoriteLabels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "labelId" uuid NOT NULL, "user_id" uuid, "label_id" uuid, CONSTRAINT "PK_0e11e9780bfcf27523dd60249d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ea348ede6719bfacde4e28c416" ON "UserFavoriteLabels" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_e39d9fc34b9e1d4c01c96ea76d" ON "UserFavoriteLabels" ("updated_at") `);
        await queryRunner.query(`ALTER TABLE "UserFavoriteLabels" ADD CONSTRAINT "FK_53c49457e77c96efaa9fadf1bf1" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "UserFavoriteLabels" ADD CONSTRAINT "FK_246c8c7158ebef1bf0af2324223" FOREIGN KEY ("label_id") REFERENCES "Labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "UserFavoriteLabels" DROP CONSTRAINT "FK_246c8c7158ebef1bf0af2324223"`);
        await queryRunner.query(`ALTER TABLE "UserFavoriteLabels" DROP CONSTRAINT "FK_53c49457e77c96efaa9fadf1bf1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e39d9fc34b9e1d4c01c96ea76d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea348ede6719bfacde4e28c416"`);
        await queryRunner.query(`DROP TABLE "UserFavoriteLabels"`);
    }

}
