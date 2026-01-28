import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCandidateUsers1747641637587 implements MigrationInterface {
    name = 'AddCandidateUsers1747641637587'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW "CourseMemberView"`);
        await queryRunner.query(`DROP VIEW "ActivityMemberView"`);

        await queryRunner.query(`ALTER TYPE "public"."Users_role_enum" RENAME TO "Users_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."Users_role_enum" AS ENUM('admin', 'teacher', 'student', 'demo', 'candidate')`);
        await queryRunner.query(`ALTER TABLE "Users" ALTER COLUMN "role" TYPE "public"."Users_role_enum" USING "role"::"text"::"public"."Users_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Users_role_enum_old"`);

        await queryRunner.query(`CREATE VIEW "CourseMemberView" AS
            -- Select distinct users from courses, including those in user groups
            SELECT
            DISTINCT ON(u.id, course.id)
            u.id,
            u.username,
            u.first_name,
            u.last_name,
            u.email,
            u.role as user_role,
            course_member.role,
            course_member.course_id,
            course.name as course_name,
            course_member.id as member_id
            FROM "CourseMembers" course_member
            -- INNER JOIN with Courses to get course details
            INNER JOIN "Courses" course ON course.id = course_member.course_id
            -- LEFT JOIN with UserGroupsUsers to account for group-based memberships
            LEFT JOIN "UserGroupsUsers" gp ON gp.group_id = course_member.group_id
            -- INNER JOIN with Users to get user details
            INNER JOIN "Users" u ON u.id = course_member.user_id OR u.id = gp.user_id
        `);

        await queryRunner.query(`CREATE VIEW "ActivityMemberView" AS
            -- Define a Common Table Expression (CTE) to select activity users
            WITH activity_users AS (
                SELECT
                DISTINCT ON (member_id)
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                course_member.course_id,
                course.name as course_name,
                activity_member.activity_id,
                activity.source->'variables'->>'title' as activity_name,
                activity_member.id as member_id
                FROM "CourseMembers" course_member

                -- INNER JOIN with Courses to get course details
                INNER JOIN "Courses" course ON course.id = course_member.course_id
                -- INNER JOIN with Activities to get activity details
                INNER JOIN "Activities" activity ON activity.course_id = course_member.course_id

                -- LEFT JOIN with ActivityMembers to get activity-specific memberships
                LEFT JOIN "ActivityMembers" activity_member ON course_member.id=activity_member.member_id
                -- LEFT JOIN with UserGroupsUsers to account for group-based memberships
                LEFT JOIN "UserGroupsUsers" gp ON gp.group_id=course_member.group_id
                -- INNER JOIN with Users to get user details
                INNER JOIN "Users" u ON u.id=activity_member.user_id OR u.id=course_member.user_id OR (activity_member.user_id IS NULL AND u.id=gp.user_id)

                -- Filter for rows with a specific activity_id
                WHERE activity_member.activity_id IS NOT NULL
            ),
            -- Define another CTE to select course users as a fallback
            fallback_course_users AS (
                SELECT
                DISTINCT ON (u.id, activity.id)
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                course_member.course_id,
                course.name as course_name,
                activity.id,
                activity.source->'variables'->>'title' as activity_name,
                NULL::uuid as member_id
                FROM "CourseMembers" course_member

                -- INNER JOIN with Courses to get course details
                INNER JOIN "Courses" course ON course.id = course_member.course_id
                -- INNER JOIN with Activities to get activity details
                INNER JOIN "Activities" activity ON activity.course_id = course_member.course_id

                -- LEFT JOIN with UserGroupsUsers to account for group-based memberships
                LEFT JOIN "UserGroupsUsers" gp ON gp.group_id = course_member.group_id
                -- INNER JOIN with Users to get user details
                INNER JOIN "Users" u ON u.id = course_member.user_id OR u.id = gp.user_id

                WHERE (
                    SELECT id FROM "ActivityMembers" activity_member WHERE activity_member.activity_id = activity.id LIMIT 1
                ) IS NULL
                -- ORDER BY to resolve which activity_id should be selected when there are multiple
                ORDER BY u.id, activity.id
            )
            -- Select all rows from the 'activity_users' CTE
            (SELECT * FROM activity_users au
            -- Combine the results from 'activity_users' with the results from 'fallback_course_users'
            UNION ALL
            -- Select rows from the 'fallback_course_users' CTE only if there are no rows in 'activity_users'
            SELECT * FROM fallback_course_users
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW "CourseMemberView"`);
        await queryRunner.query(`DROP VIEW "ActivityMemberView"`);

        await queryRunner.query(`CREATE TYPE "public"."Users_role_enum_old" AS ENUM('admin', 'teacher', 'student', 'demo')`);
        await queryRunner.query(`ALTER TABLE "Users" ALTER COLUMN "role" TYPE "public"."Users_role_enum_old" USING "role"::"text"::"public"."Users_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."Users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."Users_role_enum_old" RENAME TO "Users_role_enum"`);

        await queryRunner.query(`CREATE VIEW "CourseMemberView" AS
            -- Select distinct users from courses, including those in user groups
            SELECT
            DISTINCT ON(u.id, course.id)
            u.id,
            u.username,
            u.first_name,
            u.last_name,
            u.email,
            u.role as user_role,
            course_member.role,
            course_member.course_id,
            course.name as course_name,
            course_member.id as member_id
            FROM "CourseMembers" course_member
            -- INNER JOIN with Courses to get course details
            INNER JOIN "Courses" course ON course.id = course_member.course_id
            -- LEFT JOIN with UserGroupsUsers to account for group-based memberships
            LEFT JOIN "UserGroupsUsers" gp ON gp.group_id = course_member.group_id
            -- INNER JOIN with Users to get user details
            INNER JOIN "Users" u ON u.id = course_member.user_id OR u.id = gp.user_id
        `);

        await queryRunner.query(`CREATE VIEW "ActivityMemberView" AS
            -- Define a Common Table Expression (CTE) to select activity users
            WITH activity_users AS (
                SELECT
                DISTINCT ON (member_id)
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                course_member.course_id,
                course.name as course_name,
                activity_member.activity_id,
                activity.source->'variables'->>'title' as activity_name,
                activity_member.id as member_id
                FROM "CourseMembers" course_member

                -- INNER JOIN with Courses to get course details
                INNER JOIN "Courses" course ON course.id = course_member.course_id
                -- INNER JOIN with Activities to get activity details
                INNER JOIN "Activities" activity ON activity.course_id = course_member.course_id

                -- LEFT JOIN with ActivityMembers to get activity-specific memberships
                LEFT JOIN "ActivityMembers" activity_member ON course_member.id=activity_member.member_id
                -- LEFT JOIN with UserGroupsUsers to account for group-based memberships
                LEFT JOIN "UserGroupsUsers" gp ON gp.group_id=course_member.group_id
                -- INNER JOIN with Users to get user details
                INNER JOIN "Users" u ON u.id=activity_member.user_id OR u.id=course_member.user_id OR (activity_member.user_id IS NULL AND u.id=gp.user_id)

                -- Filter for rows with a specific activity_id
                WHERE activity_member.activity_id IS NOT NULL
            ),
            -- Define another CTE to select course users as a fallback
            fallback_course_users AS (
                SELECT
                DISTINCT ON (u.id, activity.id)
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.role,
                course_member.course_id,
                course.name as course_name,
                activity.id,
                activity.source->'variables'->>'title' as activity_name,
                NULL::uuid as member_id
                FROM "CourseMembers" course_member

                -- INNER JOIN with Courses to get course details
                INNER JOIN "Courses" course ON course.id = course_member.course_id
                -- INNER JOIN with Activities to get activity details
                INNER JOIN "Activities" activity ON activity.course_id = course_member.course_id

                -- LEFT JOIN with UserGroupsUsers to account for group-based memberships
                LEFT JOIN "UserGroupsUsers" gp ON gp.group_id = course_member.group_id
                -- INNER JOIN with Users to get user details
                INNER JOIN "Users" u ON u.id = course_member.user_id OR u.id = gp.user_id

                WHERE (
                    SELECT id FROM "ActivityMembers" activity_member WHERE activity_member.activity_id = activity.id LIMIT 1
                ) IS NULL
                -- ORDER BY to resolve which activity_id should be selected when there are multiple
                ORDER BY u.id, activity.id
            )
            -- Select all rows from the 'activity_users' CTE
            (SELECT * FROM activity_users au
            -- Combine the results from 'activity_users' with the results from 'fallback_course_users'
            UNION ALL
            -- Select rows from the 'fallback_course_users' CTE only if there are no rows in 'activity_users'
            SELECT * FROM fallback_course_users
            )
        `);
    }
}
