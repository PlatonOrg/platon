import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentationEntityForRAG1758029186216 implements MigrationInterface {
    name = 'AddDocumentationEntityForRAG1758029186216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Documentation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "content" text NOT NULL, "embedding" vector(1536) NOT NULL, "metadata" jsonb, CONSTRAINT "PK_f2f2162e03c9933b50193d323e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8884b526c1299dcb3cdfe9617c" ON "Documentation" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_422999bd53f45423e1c38abfec" ON "Documentation" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_documents_embedding" ON "Documentation" USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`);

        }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_documents_embedding"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_422999bd53f45423e1c38abfec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8884b526c1299dcb3cdfe9617c"`);
        await queryRunner.query(`DROP TABLE "Documentation"`);
    }

}
