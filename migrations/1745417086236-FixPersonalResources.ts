import { MigrationInterface, QueryRunner } from "typeorm"

export class FixPersonalResources1745417086236 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "Resources"
            SET "personal" = resources2."personal"
            FROM "Resources" AS resources2
            WHERE "Resources"."parent_id" = resources2."id";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
