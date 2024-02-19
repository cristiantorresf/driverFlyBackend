import 'reflect-metadata'
import express from 'express'
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

dotenv.config()

async function createServer() {
  const app = express()
  const httpServer = http.createServer(app)
  const server = new ApolloServer({
    typeDefs,
    resolvers: {},
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), SendTokenOverHeaders()],
    introspection: true
  })
  await server.start()

  app.use('/api', cors(), routeController)
  // @ts-ignore
  app.use('/graphql', cors<cors.CorsRequest>(), json(), expressMiddleware(
    server, {
      context: MainContexter
    }))
  const port = process.env.PORT || 4400

  await new Promise<void>(() =>
    httpServer.listen({ port }, () => {
      console.log(`🚀 Server ready at http://localhost:${port}/api`)
      console.log(`🚀 GraphQl Server ready at http://localhost:${port}/graphql`)
    })
  )
}

async function initializeDatabaseAndRunMigrations(logger: LoggerService) {
  const initializedDB = await db.initialize()
  logger.info('Databased initialized 🫡🫡🫡🫡🫡🫡🫡🫡🫡🫡', initializedDB)
  await initializedDB.runMigrations()
  logger.info('Migrations executed successfully 🫡🫡🫡🫡🫡🫡')
  const tripRepository = db.getRepository(Trip).extend({
    customDBFn() {
      return 'test'
    }
  })
  Container.set('TripRepository', tripRepository)
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
