import axios, { AxiosInstance } from 'axios'
import { ServiceData } from '../db/models/serviceData'
import * as dotenv from 'dotenv'
import { Service } from 'typedi'

@Service()
export class FetchPartnerServicesService {

  private axiosInstance: AxiosInstance

  constructor() {
    dotenv.config()
    this.axiosInstance = axios.create({
      baseURL: process.env.STRAPI_PROD_URL,
      headers: {
        Authorization: `Bearer ${process.env.STRAPI_AUTH_TOKEN}` // Include the Bearer token in the header
      }
    })
  }

  public async fetchServices(): Promise<ServiceData[]> {
    try {
      const response = await this.axiosInstance.get('/services')
      return response.data.data.map((item: any) => this.transformToServiceModel(item))
    } catch (error) {
      throw new Error(`Failed to fetch services: ${error}`)
    }
  }

  private transformToServiceModel(item: any): ServiceData {
    const { name, description, createdAt, updatedAt, publishedAt } = item.attributes
    return { name, description, createdAt, updatedAt, publishedAt, strapiId: item.id }
  }

}
