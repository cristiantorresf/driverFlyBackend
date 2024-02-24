import { readFileSync } from 'fs'
import { join } from 'path'
import * as schema from './schema.graphql'


if (schema) {
  console.log('Schema imported successfully 🚀')
}
export const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), { encoding: 'utf-8' })


