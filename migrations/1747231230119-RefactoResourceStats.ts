import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactoResourceStats1747231230119 implements MigrationInterface {
    name = 'RefactoResourceStats1747231230119'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_90423e56a0b8338517b720074c"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","ResourceStats","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "ResourceStats"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "ResourceStats" AS SELECT resource.id AS "id", resource.name AS "name", resource.members AS "members", resource.watchers AS "watchers", resource.events AS "events", resource.uses AS "uses", COALESCE(SUM(CASE WHEN resource.id = "child"."parent_id" THEN 1 ELSE 0 END), 0) AS "children", COALESCE(SUM(CASE WHEN "child"."type" = 'CIRCLE' THEN 1 ELSE 0 END), 0) AS "circles", COALESCE(SUM(CASE WHEN "child"."type" = 'ACTIVITY' THEN 1 ELSE 0 END), 0) AS "activities", COALESCE(SUM(CASE WHEN "child"."type" = 'EXERCISE' THEN 1 ELSE 0 END), 0) AS "exercises", COALESCE(SUM(CASE WHEN "child"."status" = 'READY' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'READY' THEN 1 ELSE 0 END AS "ready", COALESCE(SUM(CASE WHEN "child"."status" = 'DEPRECATED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DEPRECATED' THEN 1 ELSE 0 END AS "deprecated", COALESCE(SUM(CASE WHEN "child"."status" = 'BUGGED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'BUGGED' THEN 1 ELSE 0 END AS "bugged", COALESCE(SUM(CASE WHEN "child"."status" = 'NOT_TESTED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'NOT_TESTED' THEN 1 ELSE 0 END AS "not_tested", COALESCE(SUM(CASE WHEN "child"."status" = 'DRAFT' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DRAFT' THEN 1 ELSE 0 END AS "draft",
        (
          (
            resource.members +
            resource.watchers +
            COALESCE(SUM(CASE WHEN resource.id = "child"."parent_id" THEN 1 ELSE 0 END), 0)
          ) * 10
          + resource.uses * 0.1
          + resource.events
          + (COALESCE(SUM(CASE WHEN "child"."status" = 'READY' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'READY' THEN 1 ELSE 0 END) * 5
          - (COALESCE(SUM(CASE WHEN "child"."status" = 'BUGGED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'BUGGED' THEN 1 ELSE 0 END) * 30
          - (COALESCE(SUM(CASE WHEN "child"."status" = 'DEPRECATED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DEPRECATED' THEN 1 ELSE 0 END) * 30
          - (COALESCE(SUM(CASE WHEN "child"."status" = 'NOT_TESTED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'NOT_TESTED' THEN 1 ELSE 0 END) * 2
          - (COALESCE(SUM(CASE WHEN "child"."status" = 'DRAFT' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DRAFT' THEN 1 ELSE 0 END)
          +
          (
            (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM resource.updated_at)) / 86400
          ) / 30
        )
         AS "score" FROM (SELECT "r"."id" AS "id", "r"."name" AS "name", "r"."status" AS "status", "r"."updated_at" AS "updated_at", COUNT(DISTINCT "sd"."id") AS "uses", COUNT(DISTINCT "m"."id") AS "members", COUNT(DISTINCT "w"."id") AS "watchers", COUNT(DISTINCT "e"."id") AS "events" FROM "Resources" "r" LEFT JOIN "ResourceMembers" "m" ON "m"."resource_id" = "r"."id"  LEFT JOIN "ResourceWatchers" "w" ON "w"."resource_id" = "r"."id"  LEFT JOIN "ResourceEvents" "e" ON "e"."resource_id" = "r"."id"  LEFT JOIN "SessionData" "sd" ON
              "sd"."resource_id" = r.id
              AND "sd"."parent_id" IS NOT NULL
              AND "sd"."user_id" IS NOT NULL
              AND "sd"."answers" IS NOT NULL
             GROUP BY "r"."id", "r"."status") "resource" LEFT JOIN "Resources" "child" ON "child"."parent_id" = resource.id GROUP BY resource.id, resource.name, resource.updated_at, resource.members, resource.watchers, resource.events, resource.uses, resource.status`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","ResourceStats","SELECT resource.id AS \"id\", resource.name AS \"name\", resource.members AS \"members\", resource.watchers AS \"watchers\", resource.events AS \"events\", resource.uses AS \"uses\", COALESCE(SUM(CASE WHEN resource.id = \"child\".\"parent_id\" THEN 1 ELSE 0 END), 0) AS \"children\", COALESCE(SUM(CASE WHEN \"child\".\"type\" = 'CIRCLE' THEN 1 ELSE 0 END), 0) AS \"circles\", COALESCE(SUM(CASE WHEN \"child\".\"type\" = 'ACTIVITY' THEN 1 ELSE 0 END), 0) AS \"activities\", COALESCE(SUM(CASE WHEN \"child\".\"type\" = 'EXERCISE' THEN 1 ELSE 0 END), 0) AS \"exercises\", COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'READY' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'READY' THEN 1 ELSE 0 END AS \"ready\", COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'DEPRECATED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DEPRECATED' THEN 1 ELSE 0 END AS \"deprecated\", COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'BUGGED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'BUGGED' THEN 1 ELSE 0 END AS \"bugged\", COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'NOT_TESTED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'NOT_TESTED' THEN 1 ELSE 0 END AS \"not_tested\", COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'DRAFT' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DRAFT' THEN 1 ELSE 0 END AS \"draft\", \n        (\n          (\n            resource.members +\n            resource.watchers +\n            COALESCE(SUM(CASE WHEN resource.id = \"child\".\"parent_id\" THEN 1 ELSE 0 END), 0)\n          ) * 10\n          + resource.uses * 0.1\n          + resource.events\n          + (COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'READY' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'READY' THEN 1 ELSE 0 END) * 5\n          - (COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'BUGGED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'BUGGED' THEN 1 ELSE 0 END) * 30\n          - (COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'DEPRECATED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DEPRECATED' THEN 1 ELSE 0 END) * 30\n          - (COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'NOT_TESTED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'NOT_TESTED' THEN 1 ELSE 0 END) * 2\n          - (COALESCE(SUM(CASE WHEN \"child\".\"status\" = 'DRAFT' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DRAFT' THEN 1 ELSE 0 END)\n          +\n          (\n            (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM resource.updated_at)) / 86400\n          ) / 30\n        )\n         AS \"score\" FROM (SELECT \"r\".\"id\" AS \"id\", \"r\".\"name\" AS \"name\", \"r\".\"status\" AS \"status\", \"r\".\"updated_at\" AS \"updated_at\", COUNT(DISTINCT \"sd\".\"id\") AS \"uses\", COUNT(DISTINCT \"m\".\"id\") AS \"members\", COUNT(DISTINCT \"w\".\"id\") AS \"watchers\", COUNT(DISTINCT \"e\".\"id\") AS \"events\" FROM \"Resources\" \"r\" LEFT JOIN \"ResourceMembers\" \"m\" ON \"m\".\"resource_id\" = \"r\".\"id\"  LEFT JOIN \"ResourceWatchers\" \"w\" ON \"w\".\"resource_id\" = \"r\".\"id\"  LEFT JOIN \"ResourceEvents\" \"e\" ON \"e\".\"resource_id\" = \"r\".\"id\"  LEFT JOIN \"SessionData\" \"sd\" ON \n              \"sd\".\"resource_id\" = r.id\n              AND \"sd\".\"parent_id\" IS NOT NULL\n              AND \"sd\".\"user_id\" IS NOT NULL\n              AND \"sd\".\"answers\" IS NOT NULL\n             GROUP BY \"r\".\"id\", \"r\".\"status\") \"resource\" LEFT JOIN \"Resources\" \"child\" ON \"child\".\"parent_id\" = resource.id GROUP BY resource.id, resource.name, resource.updated_at, resource.members, resource.watchers, resource.events, resource.uses, resource.status"]);
        await queryRunner.query(`CREATE INDEX "IDX_90423e56a0b8338517b720074c" ON "ResourceStats" ("id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_90423e56a0b8338517b720074c"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","ResourceStats","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "ResourceStats"`);
    }

}
