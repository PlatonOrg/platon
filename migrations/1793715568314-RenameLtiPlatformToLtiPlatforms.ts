import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameLtiPlatformToLtiPlatforms1793715568314 implements MigrationInterface {
    name = 'RenameLtiPlatformToLtiPlatforms1793715568314'

    // The generator produces a CREATE TABLE "LtiPlatforms" (TypeORM does not detect renames):
    // rename instead to keep the platforms, using the constraint / index names it expects.
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lti_platform" RENAME TO "LtiPlatforms"`);
        await queryRunner.query(`ALTER TABLE "LtiPlatforms" RENAME CONSTRAINT "PK_366bdc87bf7611fbda944dc3c40" TO "PK_97876a0fd0c4819e2f3edce6817"`);
        await queryRunner.query(`ALTER INDEX "public"."IDX_6180a15cb3e3075bba63642756" RENAME TO "IDX_a149afacefe3cd18f3dadc704a"`);
        await queryRunner.query(`ALTER INDEX "public"."IDX_6cbab1492b037b6e355696b1a2" RENAME TO "IDX_1dd3056a08b8552efd8dd2c7db"`);
        await queryRunner.query(`ALTER INDEX "public"."IDX_e70d5213473098604265d254b3" RENAME TO "IDX_97968015a95ae8af827940b1e9"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER INDEX "public"."IDX_97968015a95ae8af827940b1e9" RENAME TO "IDX_e70d5213473098604265d254b3"`);
        await queryRunner.query(`ALTER INDEX "public"."IDX_1dd3056a08b8552efd8dd2c7db" RENAME TO "IDX_6cbab1492b037b6e355696b1a2"`);
        await queryRunner.query(`ALTER INDEX "public"."IDX_a149afacefe3cd18f3dadc704a" RENAME TO "IDX_6180a15cb3e3075bba63642756"`);
        await queryRunner.query(`ALTER TABLE "LtiPlatforms" RENAME CONSTRAINT "PK_97876a0fd0c4819e2f3edce6817" TO "PK_366bdc87bf7611fbda944dc3c40"`);
        await queryRunner.query(`ALTER TABLE "LtiPlatforms" RENAME TO "lti_platform"`);
    }

}
