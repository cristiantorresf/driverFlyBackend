/* eslint-disable */
/* tslint:disable */
// @ts-ignore

import { Container } from 'typedi'
import { Resolvers } from '../../types/typedSchema'

import { AdsRepository } from '../../../repositories/AdsRepository'
import AdsModel, { Ads } from '../../../db/models/ads'

import { ValidationService } from '../../../services/ValidationService'

import { authenticated } from '../../../middleware/authenticated'

Container.set('AdsModel', AdsModel)

const validationService = Container.get<ValidationService>(ValidationService)
const adsRepository = Container.get(AdsRepository)

// @ts-ignore
// @ts-ignore
const advertisingResolvers: Resolvers = {
  Query: {
    async getAds(_parent, _args, _context) {
      return adsRepository.getAllAds()
    },
    async getAd(_parent, { id }) {
      return { id }
    }
  },
  Ad: {
    // @ts-ignore
    async id({ id }, _, { adLoader }) {
      const { id: adId } = await adLoader.load(id)
      // @ts-ignore
      return adId
    },
    async title({ id }, _, { adLoader }) {
      const { title } = await adLoader.load(id)
      return title
    },
    async description({ id }, _, { adLoader }) {
      const { description } = await adLoader.load(id)
      return description
    },
    async location({ id }, _, { adLoader }) {
      const { location } = await adLoader.load(id)
      return location
    },
    async phoneNumber({ id }, _, { adLoader }) {
      const { phoneNumber } = await adLoader.load(id)
      return phoneNumber
    },
    async promoteImage({ id }, _, { adLoader }) {
      const { promoteImage } = await adLoader.load(id)
      return promoteImage
    },
    // @ts-ignore
    async imageList({ id }, _, { adLoader }) {
      const { imageList } = await adLoader.load(id)
      return imageList
    }
  },
  Mutation: {
    createAd: authenticated(async (_, { input }) => {
      if (!input) throw new Error('Invalid request')
      const isValidPhoneNumber = validationService.isValidPhoneNumber(input?.phoneNumber as string)
      if (!isValidPhoneNumber) {
        throw new Error('Phone number is invalid')
      }
      return adsRepository.save({ ...input } as Ads)
    })
  }
}

export default advertisingResolvers
