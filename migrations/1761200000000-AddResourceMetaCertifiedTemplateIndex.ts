import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddResourceMetaCertifiedTemplateIndex1761200000000 implements MigrationInterface {
  name = 'AddResourceMetaCertifiedTemplateIndex1761200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "ResourceMeta_certifiedTemplate_idx" ON "ResourceMeta" ((meta->'certifiedTemplate'))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."ResourceMeta_certifiedTemplate_idx"`)
  }
}
