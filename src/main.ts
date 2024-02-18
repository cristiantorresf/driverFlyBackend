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

dotenv.config()


// export function addDependencies() {
//   // Adding mongo dependency to the IoC container
//   console.log('📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕📕Registering Models dependencies')
//   Container.set('PartnerModel', PartnerModel)
//   Container.set('ServicesModel', ServiceModel)
// }


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

async function main() {
  try {
    // addDependencies()
    // await connectMongoDB()
    await createServer()
  } catch (err: any) {
    console.error(`Error: ${err.message}`)
  }
}

main()
