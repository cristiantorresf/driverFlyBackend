import mongoose, { Document, Schema } from 'mongoose'
import { ServiceData } from './serviceData'

export type Ads = {
  title: string,
  description: string,
  location: string,
  phoneNumber: string,
  promoteImage: string,
  imageList?: string[],
  service?: ServiceData
}

export interface IAds extends Document, Ads {
}

const adsSchema: Schema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  location: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: false,
    unique: true
  },
  promoteImage: {
    type: String,
    required: true,
    unique: true
  },
  imageList: {
    type: [String],
    required: true
  },
  // Relationship with the Partner collection. 1 ad belongs to a partner.
  partner: {
    type: Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  service: {
    type: Schema.Types.ObjectId, // one-to-one relationship
    ref: 'Service',
    required: false,
    unique: true
  }
})

const AdsModel = mongoose.model<IAds>('Ads', adsSchema)
export default AdsModel
