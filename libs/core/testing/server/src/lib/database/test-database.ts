import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm'

export interface TestDatabase {
  dataSource: DataSource
  container: StartedPostgreSqlContainer
  teardown: () => Promise<void>
}

/**
 * Démarre un container PostgreSQL réel via testcontainers et retourne
 * un DataSource TypeORM prêt à l'emploi.
 *
 * À utiliser dans un `beforeAll` de test d'intégration.
 * Appeler `teardown()` dans `afterAll` pour nettoyer.
 *
 * @param entities - Liste des entités TypeORM à synchroniser dans la base de test
 * @param setupSql - Instructions SQL brutes à exécuter après la synchronisation du schéma (ex: extensions,
 *   fonctions ou vues matérialisées définies par migration, absentes du `synchronize: true`)
 */
export const createTestDatabase = async (
  entities: EntityTarget<ObjectLiteral>[],
  setupSql: string[] = []
): Promise<TestDatabase> => {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('platon_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start()

  const dataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getFirstMappedPort(), // getMappedPort(5432),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
    entities: entities as never[],
    synchronize: true,
    logging: false,
    dropSchema: false,
  })

  await dataSource.initialize()

  for (const sql of setupSql) {
    await dataSource.query(sql)
  }

  const teardown = async () => {
    await dataSource.destroy()
    await container.stop()
  }

  return { dataSource, container, teardown }
}
