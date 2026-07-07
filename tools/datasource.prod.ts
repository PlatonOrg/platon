/**
 * DataSource configuration for TypeORM CLI in production.
 * Compiled to dist/tools/datasource.prod.js by tsconfig.migrations.json.
 *
 * Usage: node ./node_modules/typeorm/cli.js migration:run -d dist/tools/datasource.prod.js
 * Environment variables: DB_URL (or DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME)
 */
import 'dotenv/config'
import { DataSource } from 'typeorm'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DB_URL'],
  port: process.env['DB_PORT'] ? Number.parseInt(process.env['DB_PORT']) : undefined,
  host: process.env['DB_HOST'],
  username: process.env['DB_USERNAME'],
  password: process.env['DB_PASSWORD'],
  database: process.env['DB_NAME'],
  synchronize: false,
  logging: ['error'],
  // Chemin relatif au WORKDIR /src dans le conteneur Docker
  migrations: ['dist/migrations/*.js'],
})
