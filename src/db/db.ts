import 'reflect-metadata'
import { join } from 'path'
import { DataSource, DataSourceOptions } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { Trip } from './entities/trip'
import { config } from '../config/config'


const log = { info: console.log, error: console.error }

const { dialect, port, name } = config.db
log.info(`Currently node environment is: ${process.env.NODE_ENV}`)

export const dbOptions: DataSourceOptions = {
  // @ts-ignore
  type: dialect || 'mysql',
  database: process.env.DB_NAME || name,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 0) : port,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [Trip],
  migrations: [join(__dirname, 'migrations', '*.{ts,js,mjs}')],
  synchronize: false,
  logging: false,
  namingStrategy: new SnakeNamingStrategy()
}

const db = new DataSource(dbOptions)
// eslint-disable-next-line import/no-default-export


export default db
