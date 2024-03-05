/* eslint-disable */
/* tslint:disable */
// @ts-ignore

import { Container } from 'typedi'

import AdsModel from '../../../db/models/ads'


Container.set('AdsModel', AdsModel)


const hardCodedTrips = [{
  name: 'Trip A',
  destination: 'Destination A',
  requestedAt: '2022-01-01T12:00:00Z',
  location: 'Location A',
  state: 'State A'
}, {
  name: 'Trip B',
  destination: 'Destination B',
  requestedAt: '2022-02-01T12:00:00Z',
  location: 'Location B',
  state: 'State B'
}]

const adsResolver: any = {
  Query: {
    trips: (_parent: any, _args: any, _context: any) => {
      return hardCodedTrips
    }
  }
}
export default adsResolver
