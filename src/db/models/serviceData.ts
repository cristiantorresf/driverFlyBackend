import mongoose, { Document, Schema } from 'mongoose'

export type ServiceData = {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  strapiId: number;
}

export interface IService extends Document, ServiceData {
}

const serviceSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    strapiId: {
      type: Number,
      required: true,
      unique: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    publishedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true // Mongoose uses this to automatically manage createdAt and updatedAt properties
  }
)

const ServiceModel = mongoose.model<IService>('Service', serviceSchema)

export default ServiceModel
