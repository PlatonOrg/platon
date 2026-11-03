import { MigrationInterface, QueryRunner } from "typeorm"

export class AddNotificationGrouping1792596547234 implements MigrationInterface {
    name = "AddNotificationGrouping1792596547234"

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('COURSE-MEMBER-CREATION', 'ACTIVITY-MEMBER-CREATION', 'CORRECTOR-CREATED', 'CORRECTOR-REMOVED','CORRECTION-PENDING', 'CORRECTION-AVAILABLE','ACTIVITY-CLOSED','RESOURCE-MOVED-BY-ADMIN','EXERCISE-CHANGES','MODERATION-ACTIVITY-CHANGES','SESSION-STATE-CHANGES','RESOURCE-INVITATION','MEMBER-CREATE','MEMBER-REMOVE','RESOURCE-STATUS-CHANGE','RESOURCE-CREATE')`)

        await queryRunner.query(`ALTER TABLE "Notifications" ADD COLUMN "type" "public"."notification_type_enum"`)
        await queryRunner.query(`ALTER TABLE "Notifications" ADD COLUMN "group_id" character varying`)

        //Old notification management

        // set the type
        await queryRunner.query(`
            UPDATE "Notifications" SET "type" = (
            CASE WHEN "data"->>'type' = 'RESOURCE-EVENT'
                 THEN replace("data"#>>'{eventInfo,type}', '_', '-')
                 ELSE "data"->>'type'
            END
            )::"public"."notification_type_enum"`
        )

        // set the group_id
        // MODERATION-ACTIVITY-CHANGES and SESSION-STATE-CHANGES must not be display so they can be null
        await queryRunner.query(`
            UPDATE "Notifications" SET "group_id" = CASE "type"
            WHEN 'COURSE-MEMBER-CREATION'       THEN 'CMC_'  || ("data"->>'courseId')   || '_' || "user_id"
            WHEN 'ACTIVITY-MEMBER-CREATION'     THEN 'AMC_'  || ("data"->>'activityId') || '_' || "user_id"
            WHEN 'CORRECTOR-CREATED'            THEN 'CM_'   || ("data"->>'activityId') || '_' || "user_id"
            WHEN 'CORRECTOR-REMOVED'            THEN 'CM_'   || ("data"->>'activityId') || '_' || "user_id"
            WHEN 'CORRECTION-PENDING'           THEN 'CP_'   || ("data"->>'activityId') || '_' || "user_id"
            WHEN 'CORRECTION-AVAILABLE'         THEN 'CA_'   || ("data"->>'activityId') || '_' || "user_id"
            WHEN 'ACTIVITY-CLOSED'              THEN 'AC_'   || ("data"->>'activityId')
            WHEN 'RESOURCE-MOVED-BY-ADMIN'      THEN 'RMBA_' || ("data"->>'resourceId')
            WHEN 'EXERCISE-CHANGES'             THEN 'EC_'   || ("data"->>'resourceId')
            WHEN 'RESOURCE-INVITATION'          THEN 'RI_'   || ("data"->>'resourceId')
            WHEN 'MEMBER-CREATE'                THEN 'REMM_'  || ("data"#>>'{eventInfo,resourceId}') || '_' || ("data"#>>'{eventInfo,data,userId}')
            WHEN 'MEMBER-REMOVE'                THEN 'REMM_'  || ("data"#>>'{eventInfo,resourceId}') || '_' || ("data"#>>'{eventInfo,actorId}')
            WHEN 'RESOURCE-STATUS-CHANGE'       THEN 'RERSC_' || ("data"#>>'{eventInfo,resourceId}')
            WHEN 'RESOURCE-CREATE'              THEN 'RERC_'  || ("data"#>>'{eventInfo,resourceId}')
            END`
        )

        // mark the not readed notifications to readed if an more recent one is grouped with them
        await queryRunner.query(`
            UPDATE "Notifications" n SET "read_at" = now()
            WHERE n."read_at" IS NULL AND n."group_id" IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM "Notifications" newer
                WHERE newer."user_id" = n."user_id" AND newer."group_id" = n."group_id"
                AND (newer."created_at", newer."id") > (n."created_at", n."id")
            )`
        )

        await queryRunner.query(`ALTER TABLE "Notifications" ALTER COLUMN "type" SET NOT NULL`)
        await queryRunner.query(`CREATE INDEX "Notifications_user_id_group_id_created_at_idx" ON "Notifications" ("user_id", "group_id", "created_at")`)
        await queryRunner.query(`CREATE INDEX "Notifications_user_id_created_at_idx" ON "Notifications" ("user_id", "created_at")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."Notifications_user_id_created_at_idx"`)
        await queryRunner.query(`DROP INDEX "public"."Notifications_user_id_group_id_created_at_idx"`)
        await queryRunner.query(`ALTER TABLE "Notifications" DROP COLUMN "type"`)
        await queryRunner.query(`ALTER TABLE "Notifications" DROP COLUMN "group_id"`)
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`)
    }
}