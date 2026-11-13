import { MigrationInterface, QueryRunner } from "typeorm";

export class DropCasLmsesForeignKeys1793715501318 implements MigrationInterface {
    name = 'DropCasLmsesForeignKeys1793715501318'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cas_lmses_lmses" DROP CONSTRAINT "FK_6a4d078fbdda07b2c998b7d7331"`);
        await queryRunner.query(`ALTER TABLE "cas_lmses_lmses" DROP CONSTRAINT "FK_e0f5c84b53f74b7c63ec0b2efff"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cas_lmses_lmses" ADD CONSTRAINT "FK_e0f5c84b53f74b7c63ec0b2efff" FOREIGN KEY ("lmsesId") REFERENCES "Lmses"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "cas_lmses_lmses" ADD CONSTRAINT "FK_6a4d078fbdda07b2c998b7d7331" FOREIGN KEY ("casId") REFERENCES "Cas"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
