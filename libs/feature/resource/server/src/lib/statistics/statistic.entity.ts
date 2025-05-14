import { Index, ViewColumn, ViewEntity } from 'typeorm'
/*
SELECT
  resource.id,
  resource.name,
  resource.members,
  resource.watchers,
  resource.events,
  SUM(CASE WHEN resource.id = child.parent_id THEN 1 ELSE 0 END) as children,
  SUM(CASE WHEN child.type = 'CIRCLE' THEN 1 ELSE 0 END) as circles,
  SUM(CASE WHEN child.type = 'ACTIVITY' THEN 1 ELSE 0 END) as activities,
  SUM(CASE WHEN child.type = 'EXERCISE' THEN 1 ELSE 0 END) as exercises,
  SUM(CASE WHEN child.status = 'READY' THEN 1 ELSE 0 END) as ready,
  SUM(CASE WHEN child.status = 'DEPRECATED' THEN 1 ELSE 0 END) as deprecated,
  SUM(CASE WHEN child.status = 'BUGGED' THEN 1 ELSE 0 END) as bugged,
  SUM(CASE WHEN child.status = 'NOT_TESTED' THEN 1 ELSE 0 END) as not_tested,
  SUM(CASE WHEN child.status = 'DRAFT' THEN 1 ELSE 0 END) as draft,
  (
      (
      resource.members +
      resource.watchers +
      resource.events +
      SUM(CASE WHEN resource.id = child.parent_id THEN 1 ELSE 0 END)
    ) * 10 +
      SUM(CASE WHEN child.status = 'READY' THEN 1 ELSE 0 END) * 5 -
      SUM(CASE WHEN child.status = 'BUGGED' THEN 1 ELSE 0 END) * 10 -
      SUM(CASE WHEN child.status = 'DEPRECATED' THEN 1 ELSE 0 END) * 5 -
      SUM(CASE WHEN child.status = 'NOT_TESTED' THEN 1 ELSE 0 END) * 2 -
      SUM(CASE WHEN child.status = 'DRAFT' THEN 1 ELSE 0 END) +
      -- The more recently a resource is updated, the higher its score will be.
        (((EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM resource.updated_at)) / (60 * 60 * 24)) / 30)
    )
   AS score
FROM (
  SELECT
    resource.id,
    resource.name,
    resource.updated_at,
      COUNT(DISTINCT member.id) as members,
      COUNT(DISTINCT watcher.id) as watchers,
      COUNT(DISTINCT event.id) as events
  FROM "Resources" resource
  LEFT JOIN "ResourceMembers" member ON member.resource_id = resource.id
  LEFT JOIN "ResourceWatchers" watcher ON watcher.resource_id = resource.id
  LEFT JOIN "ResourceEvents" event ON event.resource_id = resource.id
  GROUP BY resource.id
) as resource
LEFT JOIN "Resources" child ON child.parent_id = resource.id
GROUP BY resource.id, resource.name, resource.updated_at, resource.members, resource.watchers, resource.events;



@ViewEntity({
  name: 'ResourceStats',
  materialized: true,
  expression: (dataSource) =>
    dataSource
      .createQueryBuilder()
      .select('resource.id', 'id')
      .addSelect('resource.name', 'name')
      .addSelect('resource.members', 'members')
      .addSelect('resource.watchers', 'watchers')
      .addSelect('resource.events', 'events')
      .addSelect('resource.uses', 'uses')

      .addSelect(`SUM(CASE WHEN resource.id = child.parent_id THEN 1 ELSE 0 END)`, 'children')
      .addSelect(`SUM(CASE WHEN child.type = 'CIRCLE' THEN 1 ELSE 0 END)`, 'circles')
      .addSelect(`SUM(CASE WHEN child.type = 'ACTIVITY' THEN 1 ELSE 0 END)`, 'activities')
      .addSelect(`SUM(CASE WHEN child.type = 'EXERCISE' THEN 1 ELSE 0 END)`, 'exercises')

      .addSelect(`SUM(CASE WHEN child.status = 'READY' THEN 1 ELSE 0 END)`, 'ready')
      .addSelect(`SUM(CASE WHEN child.status = 'DEPRECATED' THEN 1 ELSE 0 END)`, 'deprecated')
      .addSelect(`SUM(CASE WHEN child.status = 'BUGGED' THEN 1 ELSE 0 END)`, 'bugged')
      .addSelect(`SUM(CASE WHEN child.status = 'NOT_TESTED' THEN 1 ELSE 0 END)`, 'not_tested')
      .addSelect(`SUM(CASE WHEN child.status = 'DRAFT' THEN 1 ELSE 0 END)`, 'draft')

      .addSelect(
        `
    (
      (
        resource.uses +
        resource.members +
        resource.watchers +
        resource.events +
        SUM(CASE WHEN resource.id = child.parent_id THEN 1 ELSE 0 END)
      ) * 10 +
        SUM(CASE WHEN child.status = 'READY' THEN 1 ELSE 0 END) * 5 -
        SUM(CASE WHEN child.status = 'BUGGED' THEN 1 ELSE 0 END) * 10 -
        SUM(CASE WHEN child.status = 'DEPRECATED' THEN 1 ELSE 0 END) * 5 -
        SUM(CASE WHEN child.status = 'NOT_TESTED' THEN 1 ELSE 0 END) * 2 -
        SUM(CASE WHEN child.status = 'DRAFT' THEN 1 ELSE 0 END) +
        -- The more recently a resource is updated, the higher its score will be.
          (((EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM resource.updated_at)) / (60 * 60 * 24)) / 30)
      )
    `,
        'score'
      )
      .from(
        (subQuery) =>
          subQuery
            .select('resource.id', 'id')
            .addSelect('resource.name', 'name')
            .addSelect('resource.updated_at', 'updated_at')

            .addSelect('COUNT(DISTINCT member.id)', 'members')
            .addSelect('COUNT(DISTINCT watcher.id)', 'watchers')
            .addSelect('COUNT(DISTINCT event.id)', 'events')
            .addSelect('COUNT(DISTINCT sd.id)', 'uses')

            .from('Resources', 'resource')

            .leftJoin('ResourceMembers', 'member', 'member.resource_id = resource.id')
            .leftJoin('ResourceWatchers', 'watcher', 'watcher.resource_id = resource.id')
            .leftJoin('ResourceEvents', 'event', 'event.resource_id = resource.id')
            .leftJoin('SessionData', 'sd', 'sd.resource_id = resource.id')
            .where('where sd.parent_id is not null and sd.user_id is not null and sd.answers is not null')

            .groupBy('resource.id'),
        'resource'
      )
      .leftJoin('Resources', 'child', 'child.parent_id = resource.id')
      .groupBy(
        'resource.id, resource.name, resource.updated_at, resource.members, resource.watchers, resource.events, resource.uses'
      ),
})
*/
@ViewEntity({
  name: 'ResourceStats',
  materialized: true,
  expression: (dataSource) =>
    dataSource
      .createQueryBuilder()
      .select('resource.id', 'id')
      .addSelect('resource.name', 'name')
      .addSelect('resource.members', 'members')
      .addSelect('resource.watchers', 'watchers')
      .addSelect('resource.events', 'events')
      .addSelect('resource.uses', 'uses')

      // Children counts
      .addSelect(`COALESCE(SUM(CASE WHEN resource.id = child.parent_id THEN 1 ELSE 0 END), 0)`, 'children')
      .addSelect(`COALESCE(SUM(CASE WHEN child.type = 'CIRCLE' THEN 1 ELSE 0 END), 0)`, 'circles')
      .addSelect(`COALESCE(SUM(CASE WHEN child.type = 'ACTIVITY' THEN 1 ELSE 0 END), 0)`, 'activities')
      .addSelect(`COALESCE(SUM(CASE WHEN child.type = 'EXERCISE' THEN 1 ELSE 0 END), 0)`, 'exercises')

      // Status counts with resource.status included
      .addSelect(
        `COALESCE(SUM(CASE WHEN child.status = 'READY' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'READY' THEN 1 ELSE 0 END`,
        'ready'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN child.status = 'DEPRECATED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DEPRECATED' THEN 1 ELSE 0 END`,
        'deprecated'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN child.status = 'BUGGED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'BUGGED' THEN 1 ELSE 0 END`,
        'bugged'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN child.status = 'NOT_TESTED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'NOT_TESTED' THEN 1 ELSE 0 END`,
        'not_tested'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN child.status = 'DRAFT' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DRAFT' THEN 1 ELSE 0 END`,
        'draft'
      )

      // Score calculation (also includes resource.status)
      .addSelect(
        `
        (
          (
            resource.members +
            resource.watchers +
            COALESCE(SUM(CASE WHEN resource.id = child.parent_id THEN 1 ELSE 0 END), 0)
          ) * 10
          + resource.uses * 0.1
          + resource.events
          + (COALESCE(SUM(CASE WHEN child.status = 'READY' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'READY' THEN 1 ELSE 0 END) * 5
          - (COALESCE(SUM(CASE WHEN child.status = 'BUGGED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'BUGGED' THEN 1 ELSE 0 END) * 30
          - (COALESCE(SUM(CASE WHEN child.status = 'DEPRECATED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DEPRECATED' THEN 1 ELSE 0 END) * 30
          - (COALESCE(SUM(CASE WHEN child.status = 'NOT_TESTED' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'NOT_TESTED' THEN 1 ELSE 0 END) * 2
          - (COALESCE(SUM(CASE WHEN child.status = 'DRAFT' THEN 1 ELSE 0 END), 0) + CASE WHEN resource.status = 'DRAFT' THEN 1 ELSE 0 END)
          +
          (
            (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM resource.updated_at)) / 86400
          ) / 30
        )
        `,
        'score'
      )

      // FROM subquery
      .from(
        (subQuery) =>
          subQuery
            .select('r.id', 'id')
            .addSelect('r.name', 'name')
            .addSelect('r.updated_at', 'updated_at')
            .addSelect('r.status', 'status') // <-- Ajout du status ici
            .addSelect('COUNT(DISTINCT sd.id)', 'uses')
            .addSelect('COUNT(DISTINCT m.id)', 'members')
            .addSelect('COUNT(DISTINCT w.id)', 'watchers')
            .addSelect('COUNT(DISTINCT e.id)', 'events')
            .from('Resources', 'r')
            .leftJoin('ResourceMembers', 'm', 'm.resource_id = r.id')
            .leftJoin('ResourceWatchers', 'w', 'w.resource_id = r.id')
            .leftJoin('ResourceEvents', 'e', 'e.resource_id = r.id')
            .leftJoin(
              'SessionData',
              'sd',
              `
              sd.resource_id = r.id
              AND sd.parent_id IS NOT NULL
              AND sd.user_id IS NOT NULL
              AND sd.answers IS NOT NULL
            `
            )
            .groupBy('r.id, r.status'), // <-- Important : ajout de r.status dans le groupBy
        'resource'
      )

      // LEFT JOIN with children
      .leftJoin('Resources', 'child', 'child.parent_id = resource.id')

      // GROUP BY
      .groupBy(
        'resource.id, resource.name, resource.updated_at, resource.members, resource.watchers, resource.events, resource.uses, resource.status'
      ),
})
export class ResourceStatisticEntity {
  /**
   * Unique identifier of the resource.
   */
  @Index()
  @ViewColumn()
  id!: string

  /**
   * Name of the resource.
   */
  @ViewColumn()
  name!: string

  /**
   * Number of members of a resource.
   */
  @ViewColumn()
  members!: number

  /**
   * Number of watchers of the resource.
   */
  @ViewColumn()
  watchers!: number

  /**
   * Number of events in the resource.
   */
  @ViewColumn()
  events!: number

  /**
   * Number of times the resource has been used.
   * @remarks
   * - This is a count of all the times the resource has been used in sessionData.
   */
  @ViewColumn()
  uses!: number

  /**
   * Number of direct children of the circle resource.
   * @remarks
   * - Specific to Circle resources.
   */
  @ViewColumn()
  children!: number

  // Circle Specific

  /**
   * Number of direct subcircles of the circle resource.
   * @remarks
   * - Specific to Circle resources.
   */
  @ViewColumn()
  circles!: number

  /**
   * Number of activities in a the circle resource.
   * @remarks
   * - Specific to Circle resources.
   */
  @ViewColumn()
  activities!: number

  /**
   * Number of exercises in the circle resource.
   * @remarks
   * - Specific to Circle resources.
   */
  @ViewColumn()
  exercises!: number

  /**
   * Number of child resources with status 'READY'.
   * @remarks
   * - Count childs and also itself.
   */
  @ViewColumn()
  ready!: number

  /**
   * Number of child resources with status 'DEPRECATED'.
   * @remarks
   * - Count childs and also itself.
   */
  @ViewColumn()
  deprecated!: number

  /**
   * Number of child resources with status 'BUGGED'.
   * @remarks
   * - Count childs and also itself.
   */
  @ViewColumn()
  bugged!: number

  /**
   * Number of child resources with status 'NOT_TESTED'.
   * @remarks
   * - Count childs and also itself.
   */
  @ViewColumn()
  not_tested!: number

  /**
   * Number of child resources with status 'DRAFT'.
   * @remarks
   * - Count childs and also itself.
   */
  @ViewColumn()
  draft!: number

  /**
   * Score of the resource.
   * @remarks
   * - The score is calculated based on the number of members, watchers, events, and children.
   * - The more recently a resource is updated, the higher its score will be.
   */
  @ViewColumn()
  score!: number
}
