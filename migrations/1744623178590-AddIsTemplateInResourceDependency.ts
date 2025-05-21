import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsTemplateInResourceDependency1744623178590 implements MigrationInterface {
    name = 'AddIsTemplateInResourceDependency1744623178590'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ResourceDependencies" ADD "is_template" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`
            UPDATE "ResourceDependencies"
            SET "is_template" = true
            WHERE EXISTS (
                SELECT 1
                FROM "Resources" r1
                JOIN "Resources" r2 ON r1."id" = "ResourceDependencies"."resource_id" AND r2."id" = "ResourceDependencies"."depend_on_id"
                WHERE r1."type" = r2."type"
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ResourceDependencies" DROP COLUMN "is_template"`);
    }

}
