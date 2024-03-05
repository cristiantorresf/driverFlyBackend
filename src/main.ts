import 'reflect-metadata'
import express from 'express'
import 'graphql-import-node'
import * as http from 'http'
import { ApolloServer } from '@apollo/server'
import { typeDefs } from './gql/types'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import routeController from './controllers/routeController'
import cors from 'cors'
import { json } from 'body-parser'
import { expressMiddleware } from '@apollo/server/express4'
import * as dotenv from 'dotenv'
import { SendTokenOverHeaders } from './apolloPlugins'
import { MainContexter } from './apolloContexters'
import { Container } from 'typedi'
import { LoggerService } from './services/LoggerService'
import db from './db/db'
import { Trip } from './db/entities/trip'
import { DatabaseRespositories } from './utils/databaseUtils'
import { resolvers } from './gql/resolvers'


dotenv.config()

async function createServer() {
  const app = express()
  const httpServer = http.createServer(app)
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), SendTokenOverHeaders()],
    introspection: process.env.NODE_ENV === 'development'
  })
  await server.start()
  app.use(express.json())
  app.use('/api', cors(), routeController)
  // @ts-ignore
  app.use('/graphql', cors<cors.CorsRequest>(), json(), expressMiddleware(
    server, {
      context: MainContexter
    }))
  const port = process.env.PORT || 4400

  await new Promise<void>(() =>
    httpServer.listen({ port }, () => {
      const url = process.env.NODE_ENV === 'development' ? `http://localhost:${port}` : `https://driverflybackend-production.up.railway.app`
      console.log(`🚀 Server ready at ${url}/api`)
      console.log(`🚀 See states at ${url}/api/userStates`)
      console.log(`🚀 GraphQl Server ready at ${url}/graphql`)
    })
  )
}

async function initializeDatabaseAndRunMigrations(logger: LoggerService) {
  console.log('NODE ENV = ', process.env.NODE_ENV)
  try {
    if (process.env.NODE_ENV === 'development') {
      const initializedDB = await db.initialize()
      logger.info('Databased initialized 🫡🫡🫡🫡🫡🫡🫡🫡🫡🫡', initializedDB)
      await initializedDB.runMigrations()
      logger.info('Migrations executed successfully 🫡🫡🫡🫡🫡🫡')
      const tripRepository = db.getRepository(Trip).extend({
        customDBFn() {
          return 'test'
        }
      })
      Container.set(DatabaseRespositories.tripRepository, tripRepository)
    } else {
      logger.info('🚀🚀🚀 Skipped migrations since there is no database configuration in production')
      return false
    }
  } catch (e: any) {
    logger.error('🔥 Unable to run database no database running on environment', e)
    return false
  }

}

async function main() {
  try {
    // addDependencies()
    // await connectMongoDB()

    const logger = Container.get<LoggerService>(LoggerService)
    await initializeDatabaseAndRunMigrations(logger)
    await createServer()
  } catch (err: any) {
    console.error(`Error📛📛📛: ${err.message}`)
  }
}

main()
