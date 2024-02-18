import { Service } from 'typedi'
import { Partner } from '../db/models/partner'
import ServiceModel, { IService } from '../db/models/serviceData'
import { BaseRepository } from './BaseRepository'
import { FilterQuery, UpdateQuery } from 'mongoose'

export type UpsertCriteria = { filter: FilterQuery<IService>; update: UpdateQuery<IService> }[]

@Service()
export class ServicesRepository extends BaseRepository<IService> {

  constructor() {
    super(ServiceModel)
  }

  async findBy(criteria: Record<string, any>): Promise<Partner | null> {
    return ServiceModel.findOne(criteria)
  }

  async upsertMany(items: UpsertCriteria): Promise<any> {
    return this.upsertManyRecords.call(ServiceModel, items)
  }

}
