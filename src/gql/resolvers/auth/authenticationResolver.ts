import { Container } from 'typedi'
import { Resolvers } from '../../types/typedSchema'

import PartnerModel from '../../../db/models/partner'
import { AuthAction } from '../../../actions/authAction'

Container.set('PartnerModel', PartnerModel)

const authAction = Container.get<AuthAction>(AuthAction)


const authenticationResolvers: Resolvers = {
  Query: {
    login: async (_: any, { input }, context) => {
      try {
        const { email, password } = input
        const { partner, token } = await authAction.login(email, password)
        // return token into headers through the plugin
        context.token = token
        return partner
      } catch (e) {
        console.error('Login error:', e) // Log error for diagnostics
        throw e // Re-throw error so client is informed
      }
    }
  },
  Mutation: {
    // Add mutations related to authentication.
  }
}

export default authenticationResolvers
