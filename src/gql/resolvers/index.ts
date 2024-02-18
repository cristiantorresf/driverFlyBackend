import { mergeDeepRight } from 'ramda'
import authenticationResolvers from './auth/authenticationResolver'
import partnerResolvers from './partners/partnerResolver'
import advertisingResolvers from './ads/adsResolver'

// console.log('add dependencies type', typeof addDependencies)


export const resolvers = [authenticationResolvers, partnerResolvers, advertisingResolvers]
  .reduce((merged, resolver: any) => mergeDeepRight(merged, resolver), {})


