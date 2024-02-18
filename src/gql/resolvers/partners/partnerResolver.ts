import { Container } from 'typedi'
import { Resolvers } from '../../types/typedSchema'
import PartnerModel from '../../../db/models/partner'
import { AuthAction } from '../../../actions/authAction'

Container.set('PartnerModel', PartnerModel)
const authAction = Container.get<AuthAction>(AuthAction)


const partnerResolvers: Resolvers = {
  Query: {
    // Add queries for partners
  },
  Mutation: {
    registerPartner: async (_: any, { input }) => {
      try {
        console.log('Attempting to register Partner')
        return await authAction.registerPartner(input)
      } catch (e) {
        console.error('Registration error:', e)
        throw e
      }
    },
    deletePartner: async (_, { input }) => {
      try {
        return await authAction.deletePartner(input)
      } catch (e) {
        console.error('Deletion partner error:', e)
        throw e
      }
    }
  }
}

export default partnerResolvers
