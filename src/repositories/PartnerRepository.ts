import { Inject, Service } from 'typedi'
import PartnerModel, { Partner } from '../db/models/partner'


@Service()
export class PartnerRepository {

  constructor(@Inject('PartnerModel') private partnerModel: typeof PartnerModel) {
  }

  async save(partner: Partner): Promise<Partner> {
    const newPartner = new this.partnerModel(partner)
    return newPartner.save()
  }

  async findByEmail(email: string): Promise<Partner | null> {
    return this.partnerModel.findOne({ email })
  }

  async findBy(criteria: Record<string, any>): Promise<Partner | null> {
    return this.partnerModel.findOne(criteria)
  }

  async removeBy(criteria: Record<string, any>): Promise<boolean> {
    const result = await this.partnerModel.deleteOne(criteria)
    return result.acknowledged
  }
}
