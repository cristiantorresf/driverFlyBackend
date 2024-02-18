import { Inject, Service } from 'typedi'
import AdsModel, { Ads, IAds } from '../db/models/ads'


@Service()
export class AdsRepository {

  constructor(@Inject('AdsModel') private adsModel: typeof AdsModel) {
  }

  async getAdsById(ids: readonly string[]): Promise<IAds[]> {
    const getAdPromises = ids.map(id => this.getAdById(id))
    return Promise.all(getAdPromises)
  }

  async getAdById(id: string, operation?: string): Promise<IAds> {
    const ad = await this.adsModel.findById(id)
    console.log('🚀 Requested to the database')
    if (!ad) {
      console.log('Ad not found')
      throw new Error('Not found')
    }
    console.log(`Ad fetched successfully 🫡🫡🫡 for ${operation}`, ad.id)
    return ad
  }

  async getAllAds(): Promise<Ads[]> {
    try {
      return this.adsModel.find({})
    } catch (error) {
      console.error('Error fetching ads:', error)
      throw error
    }
  }

  async save(advertising: Ads): Promise<Ads> {
    const newAdvertising = new this.adsModel(advertising)
    return newAdvertising.save()
  }
}
