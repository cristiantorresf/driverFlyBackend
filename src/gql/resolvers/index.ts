import { mergeDeepRight } from 'ramda'
import adsResolver from './trips/tripResolver'

// console.log('add dependencies type', typeof addDependencies)


export const resolvers = [adsResolver]
  .reduce((merged, resolver: any) => mergeDeepRight(merged, resolver), {})


