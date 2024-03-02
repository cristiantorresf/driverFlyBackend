import { Service } from 'typedi'
import db from '../db/db'
import { Trip } from '../db/entities/trip'


@Service()
export class TripRepository {
  get transaction() {
    return db.getRepository(Trip).extend({
      customDBFn() {
        return 'test'
      }
    })
  }
}
