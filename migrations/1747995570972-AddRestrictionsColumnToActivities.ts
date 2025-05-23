import { MigrationInterface, QueryRunner } from "typeorm"

export class AddRestrictionsColumnToActivities1747995570972 implements MigrationInterface {
    name = 'AddRestrictionsColumnToActivities1747995570972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Vérifie si la colonne existe déjà pour éviter les erreurs
        const checkColumn = await queryRunner.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'Activities' AND column_name = 'restrictions'
        `);

        if (checkColumn.length === 0) {
            // Ajoute la colonne restrictions si elle n'existe pas
            await queryRunner.query(`ALTER TABLE "Activities" ADD "restrictions" jsonb DEFAULT '{}'`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Supprime la colonne si elle existe
        await queryRunner.query(`ALTER TABLE "Activities" DROP COLUMN IF EXISTS "restrictions"`);
    }
}