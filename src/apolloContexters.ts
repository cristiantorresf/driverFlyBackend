/* eslint-disable */
/* tslint:disable */
// @ts-ignore


import { Request, Response } from 'express'
import DataLoader from 'dataloader'
import { Container } from 'typedi'
import { AdsRepository } from './repositories/AdsRepository'
import AdsModel from './db/models/ads'

Container.set('AdsModel', AdsModel)


// Dependency injection with TypeDi
const adsRepository = Container.get(AdsRepository)
// @ts-ignore
let loaderCounter = 0
// @ts-ignore
let tokenCounter = 0


// Create DataLoaders batching and caching graphql requests
function createAdLoader() {
  const adLoader = new DataLoader(async (ids: readonly string[]) => {
    console.log('Analyzing batch function 🔥🔥🔥🔥🔥🔥', ids)
    if (!adsRepository) {
      console.log('🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯 Could instantiate the adsRepository properly')
    }
    const ads = await adsRepository.getAdsById(ids)
    const adsMap = new Map(ads.map(ad => [ad.id.toString(), ad]))
    return ids.map(id => adsMap.get(id) || new Error(`Ad not found for ID: ${id}`))
  })
  // console.log('🫡 Ad loader loaded successfully times = ', loaderCounter++)
  return adLoader
}

function getScope(authorizationHeader: string | undefined) {
  // console.log('🫡 Token contexter loaded successfully times = ', tokenCounter++)
  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    const token = authorizationHeader.split('Bearer ')[1]
    // console.log('Token 🚀')
    return token
  }
  return ''
}

type ExpressThingy = { req: Request, res: Response }
export const MainContexter = async ({ req }: ExpressThingy) => ({
  authScope: getScope(req.headers?.authorization),
  adLoader: createAdLoader()
})
