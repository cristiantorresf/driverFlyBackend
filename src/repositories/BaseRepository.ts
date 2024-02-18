import { Document, Model } from 'mongoose'
import { IRepository } from './GenericRepository'
import { UpsertCriteria } from './ServicesRepository'

export class BaseRepository<T extends Document> implements IRepository<T> {
  constructor(private model: Model<T>) {
  }

  async findAll(): Promise<T[]> {
    return this.model.find({}).lean()
  }

  async findOne(criteria: Record<string, any>): Promise<T | null> {
    return this.model.findOne(criteria)
  }

  async save(item: T): Promise<T> {
    const newItem = new this.model(item)
    // @ts-ignore
    return newItem.save()
  }

  async remove(criteria: Record<string, any>): Promise<boolean> {
    const result = await this.model.deleteOne(criteria)
    return result.acknowledged
  }

  async upsertManyRecords(
    this: Model<T>,
    items: UpsertCriteria
  ): Promise<any> {
    const bulkOps = items.map(item => ({
      updateOne: {
        filter: item.filter,
        update: item.update,
        upsert: true // This is what makes it an upsert operation
      }
    }))
    // @ts-ignore
    return this.bulkWrite(bulkOps)
  }
}
