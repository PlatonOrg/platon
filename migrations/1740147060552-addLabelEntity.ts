import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLabelEntity1740147060552 implements MigrationInterface {
    name = 'AddLabelEntity1740147060552'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Labels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "description" text, "color" character varying(255), CONSTRAINT "PK_c91f3a0d8ff656eecf07d3fa5cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0f4ef5d05616834be03415726a" ON "Labels" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_3812e547fefc99b91c4580b7e5" ON "Labels" ("updated_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_3812e547fefc99b91c4580b7e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f4ef5d05616834be03415726a"`);
        await queryRunner.query(`DROP TABLE "Labels"`);
    }

}
